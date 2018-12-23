javascript: (function () {var log = console.log;
var logData = console.log;
var MAX_TIMEOUT_COUNT = 10;
saved = 0;
function saveForLater(callback) {
	var listings = getListingsFrom('activeCartViewForm');
	for(listing of listings) {
		var saveForLaterButtonFinder = listing.getElementsByTagName('input');
		for (saveForLaterButton of saveForLaterButtonFinder) {
			if (saveForLaterButton.value == 'Save for later') {
				saveForLaterButton.click();
				whenMotionDone(
					()=>{
						var overwrap = listing.getElementsByClassName('sc-list-item-overwrap')[0];
						if(overwrap.style.display == 'none') {
							return true;
						}
						return false;
					},
					()=>{
						saved++;
						log(`saved for later ${saved}`);
						saveForLater(callback);
					});
				return;
			}
		}
	}
	callback();
}
function getListingsFrom(cartId) {
	var cart = document.getElementById(cartId);
	var listings = cart.getElementsByTagName('div');
	var listingArr  = [];
	for (listing of listings) {
		if (listing.hasAttribute('data-asin')) {
			listingArr.push(listing);
		}
	}
	return listingArr;
}
function move2cartAndCheckInventory() {
	/* move to cart */
	while(products2Check.length) {
		log(`${products2Check.length} products remaining to check`);
		var product = products2Check.pop();
		var ASIN = product.getAttribute('data-asin');
		var move2cartButtonFinder = product.getElementsByTagName('input');
		for (move2cartButton of move2cartButtonFinder) {
			if (move2cartButton.value == 'Move to Cart') {
				move2cartButton.click();
				/* wait move to cart */
				whenMotionDone(
					()=>{
						var overwrap = product.getElementsByClassName('sc-list-item-overwrap')[0];
						if(overwrap.style.display == 'none') {
							return true;
						}
						return false;
					},
					()=>{
						log(`moved to cart`);
						/* check inventory */
						var quantityBox = document.getElementsByName('quantityBox');
						if (quantityBox.length) {
							quantityBox = quantityBox[0];
							quantityBox.value = '999';
							var updateButton = quantityBox.nextElementSibling.getElementsByTagName('a')[0];
							updateButton.click();
						} else {
							log(`cannot find quantityBox for ${product}`);
						}
						var cart = document.getElementById('activeCartViewForm');
						observeNodeInsertion(cart, function () {
							var listings = getListingsFrom('activeCartViewForm');
							whenMotionDone(
								()=>{
									var overwrap = listings[0].getElementsByClassName('sc-list-item-overwrap')[0];
									if(overwrap.style.display == 'none') {
										return true;
									}
									return false;
								},
								function() {
									quantityBox = document.getElementsByName('quantityBox')[0];
									var quantity = quantityBox.value;
									logData(`ASIN ${ASIN}`);
									logData(`quantity ${quantity}`);
									insert2sheet(ASIN, quantity);
									/* next product */
									saveForLater(move2cartAndCheckInventory);
								});
						});
					});
				return;
			}
		}
		log(`Move to Cart button not found for ${ASIN}`);
		insert2sheet(ASIN, 0);
	}
	log(`mission complete!`);
	saveXlsx();
}
function observeNodeInsertion(node, callback) {
	MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserver(function(mutations, observer) {
		for(var mutation of mutations) {
			if (mutation.type == 'childList' && mutation.addedNodes.length) {
				observer.disconnect();
				observer = 0;
				callback();
			}
		}
	});
	/* define what element should be observed by the observer */
	/* and what types of mutations trigger the callback */
	observer.observe(node, {
		childList: true,
	});
}
function whenMotionDone(isDone, callback) {
	var timeoutCount = 0;
	var timer = setInterval(function(){
		timeoutCount++;
		if(isDone()) {
			clearInterval(timer);
			timeoutCount = 0;
			callback();
		} else if (timeoutCount > MAX_TIMEOUT_COUNT) {
			clearInterval(timer);
			timeoutCount = 0;
			log('wait motion done timeout');
		}
	}, 1000);
}
function getDate() {
	var today = new Date();
	var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	return date;
}
function handleDragover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}
function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files;
    var i, f;
    for (i = 0, f = files[i]; i != files.length; ++i) {
        var reader = new FileReader();
        var name = f.name;
        log(name);
        reader.onload = function(e) {
            var data = e.target.result; /* if binary string, read with type 'binary' */
            workbook = XLSX.read(data, {
                type: 'binary'
            });
            var first_sheet_name = workbook.SheetNames[0]; /* Get worksheet */
            sheet = workbook.Sheets[first_sheet_name];
            if (sheet) {
				initSheet();
				run();
            }
        };
        reader.readAsBinaryString(f);
    }
}
function isSheetEmpty() {
	if(sheet['!ref'] == undefined) {
		/* the sheet is empty */
		log(`the file is empty`);
		return true;
	}
}
function initSheet() {
	if(isSheetEmpty()) {
		XLSX.utils.sheet_add_aoa(sheet, [['ASIN', 'link', getDate()]], {origin: 'A1'});
	} else {
		var ref = sheet['!ref'];
		lastColumn = ref[ref.indexOf(':') + 1];/* bug if 'A1:AB23'*/
		XLSX.utils.sheet_add_aoa(sheet, [[getDate()]], {origin: {c: XLSX.utils.decode_col(lastColumn)+1, r: 0}});
	}
	ref = sheet['!ref'];
	lastColumn = ref[ref.indexOf(':') + 1];/* bug if 'A1:AB23'*/

}
function findRowByAsin(ASIN) {
	var columnA = 'A';
	for (var i = 1, cell; cell = sheet[columnA + i]; i++) {
		if (cell.v == ASIN) {
			return i;
		}
	}
	return null;
}
function findLastRow() {
	var ref = sheet['!ref'];
	var lastRow = ref.substr(ref.indexOf(':') + 2);/* bug if 'A1:AB23'*/
	return lastRow;
}
function insert2sheet(ASIN, quantity) {
	var row = findRowByAsin(ASIN);
	if (row) {
		XLSX.utils.sheet_add_aoa(sheet, [[quantity]], {origin: lastColumn + row});
	} else {
		XLSX.utils.sheet_add_aoa(sheet, [[ASIN, `https://www.amazon.com/dp/${ASIN}`]], {origin: -1});
		row = findLastRow();
		XLSX.utils.sheet_add_aoa(sheet, [[quantity]], {origin: lastColumn + row});
	}
}
function saveXlsx() {
	XLSX.writeFile(workbook, `Inventory${getDate()}.xlsx`);
}
function injectModule(src, callback) {
    var e = document.createElement('script');
    e.src = src;
    e.onload = callback;
    document.head.appendChild(e);
}
function run () {
	window.scrollTo(0,document.body.scrollHeight);  /* scroll to bottom to load all ASINs */
	var prevState = {notLoading: false, productCount: getListingsFrom('sc-saved-cart').length};
	whenMotionDone(
		()=>{
			var notLoading = document.getElementsByClassName('a-row a-spacing-top-medium sc-list-loading-spinner')[0].classList.contains('aok-hidden');
			var productCount = getListingsFrom('sc-saved-cart').length;
			log(`notLoading:${notLoading}, prevState.notLoading:${prevState.notLoading}, productCount:${productCount}, prevState.productCount:${prevState.productCount}`);
			if (notLoading && prevState.notLoading && (productCount == prevState.productCount)) {
				return true;				
			} else {
				prevState.notLoading = notLoading;
				prevState.productCount = productCount;
				return false;
			}
		},
		()=>{
			window.scrollTo(0, 0);
			saveForLater(function() {
				products2Check = getListingsFrom('sc-saved-cart');
				if (products2Check.length) {
					move2cartAndCheckInventory(products2Check);
				} else {
					log('waiting listing not found');
				}
			});		
		});
}
var products2Check;
injectModule('https://unpkg.com/xlsx/dist/xlsx.full.min.js', function() {
    log('xlsx injected');
    document.body.addEventListener('dragover', handleDragover, false);
    document.body.addEventListener('dragenter', handleDragover, false);
    document.body.addEventListener('drop', handleDrop, false);
});
})();
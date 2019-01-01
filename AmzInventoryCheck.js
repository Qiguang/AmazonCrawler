javascript:
var newWindow = window.open('about:blank', '_blank');
var urlWithoutFragment='https://www.amazon.com/gp/cart/view.html';
newWindow.document.write(`
        <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
        <html>
            <head>
                <title>[Autoreload] ${urlWithoutFragment}</title>
                <script type="text/javascript">
                    var firstRunFlag = true;
                    window.addEventListener("load",()=>{
                        var frame=document.getElementsByTagName("frame")[0];
                        frame.addEventListener("load",()=>{
                            console.log('loaded');
                            afterFrameLoad();
                            if (!firstRunFlag) {
                                run();
                            }
                            firstRunFlag = false;
                        },false);
                        frame.src="${urlWithoutFragment}";
                        ${inventoryTest.toString().match(/function[^{]+\{([\s\S]*)\}$/)[1]}
                    },false);
                </script>
            </head>
            <frameset>
                <frame src="about:blank">
            </frameset>
        </html>`);
newWindow.document.close();
function inventoryTest() {
    function afterFrameLoad() {
        Window = document.getElementsByTagName('frame')[0].contentWindow;
        Document = Window.document;
        showModal();
        prevTimeStamp = null;
        injectModule('https://unpkg.com/xlsx/dist/xlsx.full.min.js', function() {
            log('xlsx injected');
            logData('Ready!');
            Document.body.addEventListener('dragover', handleDragover, false);
            Document.body.addEventListener('dragenter', handleDragover, false);
            Document.body.addEventListener('drop', handleDrop, false);
    });
    }
    var log = console.log;
    /* var logData = console.log; */
    logData = log2Modal;
    var MAX_TIMEOUT_COUNT = 100;
    saved = 0;
    function saveAllForLater(callback) {
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
                            saveAllForLater(callback);
                        });
                    return;
                }
            }
        }
        callback();
    }
    function getListingsFrom(cartId) {
        var cart = Document.getElementById(cartId);
        var listings = cart.getElementsByTagName('div');
        var listingArr  = [];
        for (listing of listings) {
            if (listing.hasAttribute('data-asin')) {
                listingArr.push(listing);
            }
        }
        return listingArr;
    }
    function weWant2Delete(ASIN) {
        var row = findRowOf(ASIN, inventorySheet);
        if (row && inventorySheet[theColumnForCheckOrNot + row].v != '1') {
            return true;
        }
        return false;
    }
    function deleteRow(row, sheet) {
        var range = XLSX.utils.decode_range(sheet["!ref"]);
        var lastRow = findLastRowOf(inventorySheet);
        for(var R = row; R < lastRow; ++R){
            for(var C = range.s.c; C <= range.e.c; ++C){
                var column = XLSX.utils.encode_col(C);
                sheet[column+R] = sheet[column+(R+1)];
            }
        }
        range.e.r--;
        sheet['!ref'] = XLSX.utils.encode_range(range.s, range.e);
    }
    function move2backlog(ASIN) {
        var theRow = findRowOf(ASIN, inventorySheet);
        if (theRow) {
            if (!findRowOf(ASIN, backlogSheet)) {
            /* the ASIN doesn't exist in backlogSheet, move to it */
                var rowContent = [];
                for (var column = 0; column <= XLSX.utils.decode_col(lastColumn); column++) {
                    var theCell = inventorySheet[XLSX.utils.encode_col(column)+theRow];
                    if (typeof theCell !== 'undefined') {
                        rowContent[column] = theCell.v;
                    }
                    
                }
                XLSX.utils.sheet_add_aoa(backlogSheet, [rowContent], {origin: -1});
            }
            deleteRow(theRow, inventorySheet);
        }

    }
    function alreadyChecked(ASIN) {
        var row = findRowOf(ASIN, inventorySheet);
        if (row && typeof inventorySheet[lastColumn + row] !== 'undefined') {
            log(`${ASIN} already Checked`);
            return true;
        }
        return false;
    }
    function clickButton(product, buttonName) {
        var buttonFinder = product.getElementsByTagName('input');
        for (button of buttonFinder) {
            if (button.value == buttonName) {
                button.click();
                log(`clicked button ${buttonName}`);
                return true;
            }
        }
        log(`button ${buttonName} not found`);
        return false;
    }
    function move2cartAndCheckInventory() {
        /* move to cart */
        while(products2Check.length) {
            var estimatedEndTime = null;
            var now = new Date();
            if (prevTimeStamp) {
                estimatedEndTime = new Date(now.getTime() + products2Check.length * (now - prevTimeStamp));
            }
            prevTimeStamp = now;
            logData(`${products2Check.length} products remaining, Estimated end time: ${estimatedEndTime?estimatedEndTime.toLocaleTimeString():null}`);
            var product = products2Check.pop();
            var ASIN = product.getAttribute('data-asin');
            if (weWant2Delete(ASIN)) {
                log(`delete ${ASIN}`);
                if (clickButton(product, 'Delete')) {
                    whenMotionDone(
                        ()=>{
                            var overwrap = product.getElementsByClassName('sc-list-item-overwrap')[0];
                            if(overwrap.style.display == 'none') {
                                return true;
                            }
                            return false;
                        }, 
                        ()=>{
                            move2backlog(ASIN);
                            move2cartAndCheckInventory();
                        });
                } else {
                    move2cartAndCheckInventory();
                }
                return;
            } else if (alreadyChecked(ASIN)) {
                move2cartAndCheckInventory();
                return;
            }
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
                            var quantityBox = Document.getElementsByName('quantityBox');
                            if (quantityBox.length) {
                                quantityBox = quantityBox[0];
                                quantityBox.value = '999';
                                var updateButton = quantityBox.nextElementSibling.getElementsByTagName('a')[0];
                                updateButton.click();
                            } else {
                                log(`cannot find quantityBox for ${product}`);
                            }
                            var cart = Document.getElementById('activeCartViewForm');
                            observeNodeInsertion(cart, function () {
                                var listing = getListingsFrom('activeCartViewForm')[0];
                                whenMotionDone(
                                    ()=>{
                                        var overwrap = listing.getElementsByClassName('sc-list-item-overwrap')[0];
                                        if(overwrap.style.display == 'none') {
                                            return true;
                                        }
                                        return false;
                                    },
                                    function() {
                                        quantityBox = Document.getElementsByName('quantityBox')[0];
                                        var alert = listing.getElementsByClassName('a-alert-content');
                                        var limit;
                                        var quantity;
                                        if (alert.length) {
                                            limit = alert[0].innerText.match(/limit\s+of\s+(\d+)/);
                                            onlyNleft = listing.getElementsByClassName('sc-product-availability');
                                            onlyNleft = onlyNleft.length?onlyNleft[0].innerText.match(/Only\s+(\d+)/):null;
                                            onlyNleft = onlyNleft?onlyNleft[1]:null;
                                        }
                                        if (limit) {
                                            if (onlyNleft) {
                                                quantity = onlyNleft;
                                            } else {
                                                quantity = -limit[1];
                                            }
                                        } else {
                                            quantity = quantityBox.value;
                                        }
                                        log(`ASIN ${ASIN}, quantity ${quantity}`);
                                        insertQuantity2InventorySheet(ASIN, quantity);
                                        /* next product */
                                        saveAllForLater(move2cartAndCheckInventory);
                                    });
                            });
                        });
                    return;
                }
            }
            log(`Move to Cart button not found for ${ASIN}`);
            insertQuantity2InventorySheet(ASIN, 0);
        }
        /* all listings have been checked, move ASINs which CheckOrNot flag is not set to backlogSheet */
        for (let row = 2, lastRow = findLastRowOf(inventorySheet); row <= lastRow; row++) {
            let theAsin = inventorySheet[theColumnForAsin + row].v;
            if (weWant2Delete(theAsin)) {
                move2backlog(theAsin);
            }
        }
        logData(`mission complete!`);
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
            if (Document.readyState == 'loading' || timeoutCount > MAX_TIMEOUT_COUNT) {
                clearInterval(timer);
                timeoutCount = 0;
                log('wait motion done timeout or page reloaded');
            } else if(isDone()) {
                clearInterval(timer);
                timeoutCount = 0;
                callback();
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
                var firstSheetName = workbook.SheetNames[0]; /* Get worksheet */
                var secondSheetName = workbook.SheetNames[1]; /* Get worksheet */
                inventorySheet = workbook.Sheets[firstSheetName];
                backlogSheet = workbook.Sheets[secondSheetName];
                if (!backlogSheet) {
                    backlogSheet = XLSX.utils.aoa_to_sheet([[]]);
                    XLSX.utils.book_append_sheet(workbook, backlogSheet, 'backlog');
                }
                if (inventorySheet && backlogSheet) {
                    logData('Running!');
                    initInventorySheet();
                    run();
                } else {
                    log(`get sheet from file failed: ${inventorySheet?true:false}, ${backlogSheet?true:false}`);
                }
            };
            reader.readAsBinaryString(f);
        }
    }
    function isInventorySheetEmpty() {
        if(inventorySheet['!ref'] == undefined) {
            /* the inventorySheet is empty */
            log(`the file is empty`);
            return true;
        }
    }
    function initInventorySheet() {
        if(isInventorySheetEmpty()) {
            generateHeaderLine();
        } else {
            var ref = inventorySheet['!ref'];
            lastColumn = ref.match(/:([a-zA-Z]+)/)[1];
            XLSX.utils.sheet_add_aoa(inventorySheet, [[getDate()]], {origin: {c: XLSX.utils.decode_col(lastColumn)+1, r: 0}});
        }
        ref = inventorySheet['!ref'];
        lastColumn = ref.match(/:([a-zA-Z]+)/)[1];
        theColumnForAsin = 'A';
        theColumnForCheckOrNot = 'B';
        theColumnForComments = 'C';
    }
    function findRowOf(ASIN, sheet) {
        for (var i = 1, cell; cell = sheet[theColumnForAsin + i]; i++) {
            if (cell.v == ASIN) {
                return i;
            }
        }
        return null;
    }
    function getTitle(ASIN) {
        log(`title: `);
        var theProduct = Document.querySelectorAll(`[data-asin=${ASIN}]`);
        if (theProduct.length) {
            theProduct = theProduct[0];
        } else {
            return null;
        }
        var theTitle = theProduct.getElementsByClassName('sc-product-title');
        if (theTitle.length) {
            theTitle = theTitle[0].innerText;
        } else {
            return null;
        };
        log(theTitle);
        return theTitle;
    }
    function generateHeaderLine() {
        XLSX.utils.sheet_add_aoa(inventorySheet, [['ASIN', 'CheckOrNot', 'Comments', getDate()]], {origin: 'A1'});
    }
    function generateLineFor(ASIN) {
        var title = getTitle(ASIN);
        XLSX.utils.sheet_add_aoa(inventorySheet, [[ASIN, 1, title]], {origin: -1});
        inventorySheet[theColumnForAsin + findLastRowOf(inventorySheet)].l = {Target: `https://www.amazon.com/dp/${ASIN}`};
    }
    function findLastRowOf(sheet) {
        var ref = sheet['!ref'];
        var lastRow = ref.match(/:[a-zA-Z]+(\d+)/)[1];
        return lastRow;
    }
    function insertQuantity2InventorySheet(ASIN, quantity) {
        var row = findRowOf(ASIN, inventorySheet);
        if (!row) {
            generateLineFor(ASIN);
        }
        row = findRowOf(ASIN, inventorySheet);
        XLSX.utils.sheet_add_aoa(inventorySheet, [[quantity]], {origin: lastColumn + row});
        inventorySheet[lastColumn + row].t = 'n';
        if (inventorySheet[theColumnForComments+row] == null) {
            XLSX.utils.sheet_add_aoa(inventorySheet, [[getTitle(ASIN)]], {origin: theColumnForComments + row});
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
        saveAllForLater(()=>{
            var saveForLaterListings = Document.getElementsByClassName('a-row sc-list-body sc-java-remote-feature')[0];
            var prevState = {notLoading: false, productCount: getListingsFrom('sc-saved-cart').length, scrollY: window.scrollY};
            saveForLaterListings.scrollIntoView({block: "end"});
            whenMotionDone(
                ()=>{
                    var loadingSpinner = Document.getElementsByClassName('a-row a-spacing-top-medium sc-list-loading-spinner')[0];
                    var notLoading = loadingSpinner.classList.contains('aok-hidden');
                    var productCount = getListingsFrom('sc-saved-cart').length;
                    log(`notLoading:${notLoading}, prevState.notLoading:${prevState.notLoading}, productCount:${productCount}, prevState.productCount:${prevState.productCount}, scrollY:${window.scrollY}, prevState.scrollY:${prevState.scrollY}`);
                    if (notLoading && prevState.notLoading && (productCount == prevState.productCount) && (window.scrollY == prevState.scrollY)) {
                        return true;				
                    } else {
                        prevState.notLoading = notLoading;
                        prevState.productCount = productCount;
                        prevState.scrollY = window.scrollY;
                        saveForLaterListings.scrollIntoView({block: "end"});
                        return false;
                    }
                },
                ()=>{
                    Window.scrollTo(0, 0);
                    products2Check = getListingsFrom('sc-saved-cart');
                    if (products2Check.length) {
                        move2cartAndCheckInventory(products2Check);
                    } else {
                        log('get listings from sc-saved-cart failed');
                    }
                });
        });
    }
    function showModal(){
        var modal = Document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        var modalContent = Document.createElement('div');
        modalContent.className = 'modal-content';
        var span = Document.createElement('span');
        span.className = 'close';
        span.innerText = 'AmazonInventoryTest';
        modalMainLine = Document.createElement('h1');
        modalMainLine.id = 'modalLine';
        modalContent.appendChild(span);
        modalContent.appendChild(modalMainLine);
        modal.appendChild(modalContent);
        modal.style.display = 'block'; /* Hidden by default */
        modal.style.position = 'fixed'; /* Stay in place */
        modal.style.zIndex = '1000'; /* Sit on top */
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%'; /* Full width */
        modal.style.height = '100%'; /* Full height */
        modal.style.overflow = 'auto'; /* Enable scroll if needed */
        modal.style.backgroundColor = 'rgb(0,0,0)'; /* Fallback color */
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)'; /* Black w/ opacity */
        modalContent.style.backgroundColor = '#fefefe';
        modalContent.style.margin = '1% auto'; /* 15% from the top and centered */
        modalContent.style.padding = '20px';
        modalContent.style.border = '1px solid #888';
        modalContent.style.width = '80%'; /* Could be more or less, depending on screen size */
        Document.body.appendChild(modal);
    }
    function log2Modal(theLog) {
        if (typeof modalMainLine !== 'undefined') {
            modalMainLine.innerText = theLog;
        }
    }
}

javascript:
function init() {
    maxRowsInSheet = 10000;
    maxSimultaneousCount = 10;
    simultaneousCount = 0;
    tradeMarksIndex = 0;
    storeIndex = 0;
    stop = 0;
    parser = new DOMParser();
    count = 0;
    initSheet();
}
log = console.log;
var maxRowsInSheet;
var maxSimultaneousCount;
var simultaneousCount;
var storeIndex;
var stop;
var log;

function fetchFrom(url, handler, onError, meta) {
    meta.url = url;
    fetch(url).then(function(response) {
        if (response.ok) {
            response.text().then((data) => {
                handler(data, meta)
            })
        } else {
            log(url);
            simultaneousCount--;
        }
    });
    simultaneousCount++;
}
var parser;

function handler(data, meta) {
    simultaneousCount--;
    var doc = parser.parseFromString(data, "text/html");
    switch (meta.handlerStep) {
        case 1:
            if (doc.getElementById('noResultsTitle')) log(meta.theTradeMark + ' did not match any products');
            else {
                regex1stTry = new RegExp('<a ((?!href).)*href="([^"]*)"><h2((?!<span).)*<span((?!<span).)*<span[^>]*>' + meta.theTradeMark + '[^<]*<\/span>', "i");
                regex2ndTry = new RegExp('<a class="a-link-normal\\s+s-access-detail-page\\s+s-color-twister-title-link\\s+a-text-normal"\\s+title="((?!' + meta.theTradeMark + '))*' + meta.theTradeMark + '[^"]*"\\s+href="([^"]*)"');
                if (result = regex1stTry.exec(data)) {
                    fetchFrom(result[2] + '&th=1&psc=1', handler, null, meta);
                    meta.handlerStep = 2;
                } else if (result = regex2ndTry.exec(data)) {
                    log(result[1]);
                    log(result[2]);
                } else {
                    log(meta.theTradeMark);
                    log('get seller failed');
                }
            }
            break;
        case 2:
            var merchantInfo;
            var link;
            if ((merchantInfo = doc.getElementById('merchantID')) && merchantInfo.value) {
                var link = 'https://www.amazon.com/sp?_encoding=UTF8&seller=' + merchantInfo.value;
                log(meta.theTradeMark);
                log('store link');
                log(link);
                fetchFrom(link, handler, null, meta);
                meta.handlerStep = 3;
            } else {
                log(meta.theTradeMark);
                log('got store failed');
                log('from ' + meta.url);
            }
            break;
        case 3:
            store = doc.getElementById('storefront-link').getElementsByTagName('a')[0];
            if (!store) {
                break;
            }
            storeLink = store.href;
            storeName = store.innerText;
            var theStoreHasBeenCrawled = false;
            for (var i = 0, len = storeArray.length; i < len; i++) {
                if (storeArray[i].includes(storeName)) {
                    theStoreHasBeenCrawled = true;
                }
            }
            if (theStoreHasBeenCrawled) {
                break;
            }
            var table = doc.getElementById('feedback-summary-table');
            if (table) {
                var _30daysPositive = table.firstElementChild.firstElementChild.nextElementSibling.firstElementChild.nextElementSibling;
                var _90daysPositive = _30daysPositive.nextElementSibling;
                var _12monthsPositive = _90daysPositive.nextElementSibling;
                var lifetimePositive = _12monthsPositive.nextElementSibling;
                if (_30daysPositive) {
                    _30daysPositive = _30daysPositive.innerText.replace(/\s+/g, '');
                }
                if (_90daysPositive) {
                    _90daysPositive = _90daysPositive.innerText.replace(/\s+/g, '');
                }
                if (_12monthsPositive) {
                    _12monthsPositive = _12monthsPositive.innerText.replace(/\s+/g, '');
                }
                if (lifetimePositive) {
                    lifetimePositive = lifetimePositive.innerText.replace(/\s+/g, '');
                }
                var _30daysCount = table.firstElementChild.firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.firstElementChild.nextElementSibling;
                var _90daysCount = _30daysCount.nextElementSibling;
                var _12monthsCount = _90daysCount.nextElementSibling;
                var lifetimeCount = _12monthsCount;
                if (_30daysCount) {
                    _30daysCount = _30daysCount.innerText;
                }
                if (_90daysCount) {
                    _90daysCount = _90daysCount.innerText;
                }
                if (_12monthsCount) {
                    _12monthsCount = _12monthsCount.innerText;
                }
                if (lifetimeCount) {
                    lifetimeCount = lifetimeCount.innerText;
                }
            } else {
                log(meta.theTradeMark);
                log('got ratings by time failed');
            }
            store = doc.getElementById('storefront-link').getElementsByTagName('a')[0];
            storeLink = store.href;
            storeName = store.innerText;
            meta.storeIndex = ++storeIndex;
            meta.storeName = storeName;
            meta.storeLink = storeLink;
            meta._30daysCount = _30daysCount;
            meta._30daysPositive = _30daysPositive;
            meta._90daysCount = _90daysCount;
            meta._90daysPositive = _90daysPositive;
            meta._12monthsCount = _12monthsCount;
            meta._12monthsPositive = _12monthsPositive;
            meta.lifetimeCount = lifetimeCount;
            meta.lifetimePositive = lifetimePositive;
            fetchFrom(storeLink, handler, null, meta);
            meta.handlerStep = 4;
            break;
        case 4:
            listingCount = doc.getElementById('s-result-count');
            if (listingCount) {
                log(listingCount = listingCount.innerText);
                var result = listingCount.match(/[^\s]+\s+results/);
                if (result) {
                    listingCount = result[0];
                }
            } else {
                log('0');
            }
            addRow2StoreSheet(meta.storeIndex, meta.storeName, meta.storeLink, meta._30daysCount, meta._30daysPositive, meta._90daysCount, meta._90daysPositive, meta._12monthsCount, meta._12monthsPositive, meta.lifetimeCount, meta.lifetimePositive, listingCount);
            regex = new RegExp('a class="a-link-normal s-ref-text-link" href="([^"]*)"><span((?!">).)*">([^<]*)<\\/span>', 'g');
            while (result = regex.exec(data)) {
                log(result[1]);
                log(result[3]);
            }
            crawlStoreList(doc);
            var nextPage = doc.getElementById('pagnNextLink');
            if (nextPage) {
                fetchFrom(nextPage.href, handler, null, meta);
                meta.handlerStep = 5;
            }
            break;
        case 5:
            crawlStoreList(doc);
            var nextPage = doc.getElementById('pagnNextLink');
            if (nextPage) {
                fetchFrom(nextPage.href, handler, null, meta);
            }
            break;
    }
    var tradeMark;
    if (hasNextTradeMark() && !stop) {
        for (var i = 0;
            (i < maxSimultaneousCount - simultaneousCount) && (tradeMark = getNextTradeMark()); i++) {
            fetchFrom('https://www.amazon.com/s/field-keywords=' + tradeMark, handler, null, {
                theTradeMark: tradeMark,
                handlerStep: 1
            });
        }
    } else if (!simultaneousCount) {
        makeXlsx([{
            sheet: productArray,
            name: 'products'
        }, {
            sheet: storeArray,
            name: 'stores'
        }], 'products.xlsx');
        if (hasNextTradeMark()) {
            makeXlsx([{
                sheet: getRemainTradeMarks(),
                name: 'remaining'
            }], 'remainingTrademarks.xlsx');
        }
        log('------------------finish--------------------');
    }
}
var count;

function crawlStoreList(doc) {
    var items = doc.getElementsByClassName('s-item-container');
    var storeName = doc.getElementById('s-result-count').firstElementChild.innerText;
    for (var i = 0; i < items.length; i++) {
        elements = items[i].getElementsByClassName('s-access-detail-page');
        if (elements.length) {
            var title = elements[0].title;
            var detailPageLink = elements[0].href;
            elements = items[i].getElementsByClassName('a-size-small a-color-secondary');
            if (elements.length > 1 && elements[0].innerText.match(/^by/)) {
                var trademark = elements[1].innerText;
            }
            elements = items[i].getElementsByClassName('a-offscreen');
            var price = elements.length ? elements[0].innerText : undefined;
            elements = items[i].getElementsByClassName('a-icon-star');
            var stars = elements.length ? elements[0].innerText : undefined;
            elements = items[i].getElementsByClassName('a-row a-spacing-none');
            var reviewCount = undefined;
            if (stars && elements) {
                elements = elements[elements.length - 1].getElementsByClassName('a-size-small a-link-normal a-text-normal');
                var reviews = elements ? elements[0] : undefined;
                if (reviews && reviews.innerText.match(/^[^A-Za-z]/)) {
                    reviewCount = reviews.innerText;
                    reviewLink = reviews.href;
                }
            }
            addRow2ProductSheet(++count, title, price, reviewCount, stars, trademark, storeName, detailPageLink, reviewLink);
            log(count);
        }
    }
}

function addRow2ProductSheet(index, title, price, reviewCount, stars, trademark, storeName, detailPageLink, reviewLink) {
    var row = [];
    row.push(index);
    row.push(price);
    row.push(reviewCount);
    row.push(stars);
    row.push(trademark);
    row.push(storeName);
    row.push(detailPageLink);
    row.push(reviewLink);
    row.push(title);
    productArray.push(row);
    if (productArray.length >= maxRowsInSheet) {
        makeXlsx([{
            sheet: productArray,
            name: 'products'
        }, {
            sheet: storeArray,
            name: 'stores'
        }], 'products.xlsx');
        makeXlsx([{
            sheet: getRemainTradeMarks(),
            name: 'remaining'
        }], 'remainingTrademarks.xlsx');
        initSheet();
    }
}

function addRow2StoreSheet(index, storeName, storeLink, _30daysCount, _30daysPositive, _90daysCount, _90daysPositive, _12monthsCount, _12monthsPositive, lifetimeCount, lifetimePositive, listingCount) {
    var row = [];
    row.push(index);
    row.push(storeName);
    row.push(listingCount);
    row.push(_30daysCount);
    row.push(_30daysPositive);
    row.push(_90daysCount);
    row.push(_90daysPositive);
    row.push(_12monthsCount);
    row.push(_12monthsPositive);
    row.push(lifetimeCount);
    row.push(lifetimePositive);
    row.push(storeLink);
    storeArray.push(row);
}

function injectModule(src, callback) {
    var e = document.createElement('script');
    e.src = src;
    e.onload = callback;
    document.head.appendChild(e);
}
var tradeSheet;

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files;
    var i, f;
    for (i = 0, f = files[i]; i != files.length; ++i) {
        var reader = new FileReader();
        var name = f.name;
        reader.onload = function(e) {
            init();
            var data = e.target.result; /* if binary string, read with type 'binary' */
            var workbook = XLSX.read(data, {
                type: 'binary'
            });
            var first_sheet_name = workbook.SheetNames[0]; /* Get worksheet */
            tradeSheet = workbook.Sheets[first_sheet_name];
            if (tradeSheet) {
                var tradeMark = getNextTradeMark();
                if (tradeMark) {
                    fetchFrom('https://www.amazon.com/s/field-keywords=' + tradeMark, handler, null, {
                        theTradeMark: tradeMark,
                        handlerStep: 1
                    });
                } else {
                    log('trade mark not found from this file');
                }
            }
        };
        reader.readAsBinaryString(f);
    }
}
var tradeMarksIndex;

function getNextTradeMark() {
    var tradeMark = tradeSheet['A' + (tradeMarksIndex + 2)];
    tradeMarksIndex++;
    if (tradeMark) {
        return tradeMark.v.toLowerCase();
    } else {
        return undefined;
    }
}

function hasNextTradeMark() {
    var tradeMark = tradeSheet['A' + (tradeMarksIndex + 2)];
    if (tradeMark) {
        return true;
    } else {
        return false;
    }
}

function getRemainTradeMarks() {
    var remaining = [];
    remaining.push(['trademarks']);
    for (var i = tradeMarksIndex; tradeSheet['A' + (i + 2)]; i++) {
        var row = [];
        row.push(tradeSheet['A' + (i + 2)].v);
        remaining.push(row);
    }
    return remaining;
}
var productArray;
var storeArray;

function initSheet() {
    productArray = [
        ['index', 'price', 'reviewCount', 'stars', 'trademark', 'storeName', 'detailPageLink', 'reviewLink', 'title']
    ];
    storeArray = [
        ['index', 'storeName', 'listingCount', '_30daysCount', '_30daysPositive', '_90daysCount', '_90daysPositive', '_12monthsCount', '_12monthsPositive', 'lifetimeCount', 'lifetimePositive', 'storeLink']
    ];
}

function makeXlsx(sheetArray, filename) {
    var wb = XLSX.utils.book_new();
    for (var i = 0; i < sheetArray.length; i++) {
        var ws = XLSX.utils.aoa_to_sheet(sheetArray[i].sheet);
        XLSX.utils.book_append_sheet(wb, ws, sheetArray[i].name);
    }
    XLSX.writeFile(wb, filename);
}

function handleDragover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}
injectModule('https://unpkg.com/xlsx/dist/xlsx.full.min.js', function() {
    log('xlsx injected');
    alert('ready, please drag tradeMark.xlsx file to this page');
    document.body.addEventListener('dragover', handleDragover, false);
    document.body.addEventListener('dragenter', handleDragover, false);
    document.body.addEventListener('drop', handleDrop, false);
});

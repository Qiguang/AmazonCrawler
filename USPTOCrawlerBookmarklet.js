javascript:
var log = console.log;

function getStart() {
    var start;
    do {
        start = prompt('从第几条开始抓取(1~' + total + ')', i);
    }
    while (start && (start < 1 || start > total));
    return start;
}

function getEnd() {
    var end;
    do {
        end = prompt('抓取到第几条(1~' + total + ')', total);
    }
    while (end && (end < 1 || end > total));
    return end;
}

function injectModule(src, callback) {
    var e = document.createElement('script');
    e.src = src;
    e.onload = callback;
    document.head.appendChild(e);
}
var sheetArray = [];

function makeXlsx(sheetArray) {
    var filename = "tradeMark.xlsx";
    var ws_name = "SheetJS";
    var wb = XLSX.utils.book_new(),
        ws = XLSX.utils.aoa_to_sheet(sheetArray);
    /* add worksheet to workbook */
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    /* write workbook */
    XLSX.writeFile(wb, filename);
}
var total = /Record \d+ out of (\d*)/.exec(document.body.textContent)[1];
var failTimes = 0;
var i = 1;
sheetArray.push(['Word Mark', 'Index', 'Filing Date', 'Registration Date', 'Owner']);

function doIt() {
    fetch(window.location.href.slice(0, window.location.href.lastIndexOf('=') + 1) + i).then(function(response) {
        if (response.ok) {
            failTimes = 0;
            response.text().then(function(data) {
                var result;
                log(i);
                if (result = /This search session has expired/.exec(data)) {
                    i = total + 1;
                    log('This search session has expired');
                } else if ((result = /<B>(Word Mark)\s*<\/B><\/TD>\s*<TD>\s*([^<]+)<\/TD>/.exec(data)) && (result[2].includes('Document'))) {
                    log('Document Unavailable or Has Been Deleted');
                } else if (result) {
                    var row = [];
                    log(result[2]);
                    row.push(result[2]);
                    row.push(i);
                    result = /<B>(Filing Date)\s*<\/B><\/TD>\s*<TD>\s*([^<]+)<\/TD>/.exec(data);
                    row.push(result ? result[2] : 'NULL');
                    result = /<B>(Registration Date)\s*<\/B><\/TD>\s*<TD>\s*([^<]+)<\/TD>/.exec(data);
                    row.push(result ? result[2] : 'NULL');
                    result = /<B>(Owner)\s*<\/B><\/TD>\s*<TD>\s*((((?!<\/TD>).)+\n.*)*)<\/TD>/.exec(data);
                    row.push(result ? result[2].replace(/\n/g, '\s') : 'NULL');
                    sheetArray.push(row);
                    if (sheetArray.length == 10000) {
                        makeXlsx(sheetArray);
                        sheetArray = [];
                    }
                }
                if (++i <= total) {
                    doIt();
                } else {
                    makeXlsx(sheetArray);
                }
            })
        } else {
            failTimes++;
            if (failTimes > 10) makeXlsx(sheetArray);
            else doIt();
        }
    });
}
injectModule('https://unpkg.com/xlsx/dist/xlsx.full.min.js', function() {
    console.log('xlsx injected');
    if ((i = getStart()) && (total = getEnd())) doIt();
    else {
        log('finish')
    }
});

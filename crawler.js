var log = console.log;
var request = require('request');
var mysql = require('mysql');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'amazon'
});

function insertTradeMark(trade_mark, filing_date, registration_date, owner) {
    connection.connect();
    var sql = 'INSERT INTO ?? (??, ??, ??, ??) VALUES (?, DATE(?), DATE(?), ?)';
    var inserts = ['trade_marks', 'trade_mark', 'filing_date', 'registration_date', 'owner', trade_mark, filing_date, registration_date, owner];
    var query = mysql.format(sql, inserts);
    log(query);
    connection.query(query, function (error, results, fields) {
        if (error) {
            log(error);
        }
    });
    connection.end();
}
function searchUrlFromPage(url, searchTask) {
    var options = {
        headers: {'user-agent': 'node.js'}
    }
    request(url, options, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            const dom = new JSDOM(body);
            var a = dom.window.document.getElementsByTagName('a');
            for (var j = 0, len_j = searchTask.length; j < len_j; j++) {
                for (var i = 0, len_i = a.length; i < len_i; i++) {
                    if (a[i].textContent == searchTask[j].searchTerm) {
                        searchTask[j].callback(a[i].href);
                        log(a[i].href);
                        break;
                    }
                }
            }
        } else {
            log('error: ', error);
            log('statusCode: ', response&& response.statusCode);
        }
    })
}
var url = 'https://www.uspto.gov/trademark';
var searchTask = [{
    searchTerm: 'Search TESS',
    callback: function (url) {
        var searchTask = [{
            searchTerm: 'Basic Word Mark Search (New User)',
            callback: function (url) {
                var searchTask = [{
                    searchTerm: ''
                }]
                log(url);
            }
        }];
        searchUrlFromPage(url, searchTask);
    }
}];

searchUrlFromPage(url, searchTask);
//insertTradeMark('lenietch', '2019-2-3', '', 'absldfkjfaf');

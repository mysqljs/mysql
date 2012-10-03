var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');
var Types      = require('../../../').Types;

connection.connect();

var rows1 = undefined, rows2 = undefined;

connection.query({
  sql     : "SELECT NOW() as date",
  castMap : false,
}, function(err, _rows) {
  if (err) throw err;
  rows1 = _rows;
});

var castMap = {};
castMap[Types.MYSQL_LONGLONG] = Types.JS_NUMBER;

connection.query({
  sql     : "SELECT 23 as num",
  castMap : castMap
}, function(err, _rows, f) {
  if (err) throw err;
  rows2 = _rows;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows1[0].date, 'string');
  assert.strictEqual(typeof rows2[0].num, 'number');
});

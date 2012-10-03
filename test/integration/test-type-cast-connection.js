var common     = require('../common');
var assert     = require('assert');
var Types      = require('../../').Types;

var castMap = {};

castMap[Types.MYSQL_LONGLONG]=Types.JS_NUMBER;
var connection = common.createConnection({
  castMap: castMap
});

connection.connect();

var options = {
  sql      : "SELECT NOW() as date, 42 as answer"
};

var rows = undefined;
var query = connection.query(options, function(err, _rows, f) {
  if (err) throw err;
  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'object');
  assert.strictEqual(typeof rows[0].answer, 'number');
});


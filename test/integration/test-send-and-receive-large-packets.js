var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

var length = Math.pow(256, 3) / 2; // Half, because of hex encoding
var buffer = new Buffer(length);
var sql    = 'SELECT ? as bigField';

var rows = [];
connection.query(sql, [buffer], function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bigField.length, length);
});

var common     = require('../common');
var connection = common.createConnection({debug: true});
var assert     = require('assert');

var character = 'a';
var times     = Math.pow(256, 3) + 100;
var sql       = 'SELECT BINARY REPEAT(?, ?) as bigField';

var rows = [];
connection.query(sql, [character, times], function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bigField.length, times);
});

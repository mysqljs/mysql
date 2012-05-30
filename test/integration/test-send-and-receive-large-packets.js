var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

var length = Math.pow(256, 3) / 2; // Half, because of hex encoding
var buffer = new Buffer(length);
var sql    = 'SELECT ? as bigField';

var rows = [];

// Nesting the query inside the connect() method because our buffer to hex shim
// for node v0.4.x takes ~12sec on TravisCI causing a handshake timeout unless
// we do the handshake first before creating the SQL query.
connection.connect(function(err) {
  if (err) throw err;

  connection.query(sql, [buffer], function(err, _rows) {
    if (err) throw err;

    rows = _rows;
  });

  connection.end();
});

process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bigField.length, length);
});

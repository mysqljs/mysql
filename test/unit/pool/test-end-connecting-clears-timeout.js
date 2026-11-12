var assert = require('assert');
var mysql = require('../../../index.js');

// Connecting to a closed port leaves the connection in the "disconnected"
// state. pool.end() destroys those connections; the connect timeout must be
// cleared so it does not keep the event loop alive (#2591).
var pool = mysql.createPool({
  host: '127.0.0.1',
  port: 1,
  connectTimeout: 5000
});

pool.query('SELECT 1', function () {});

pool.end(function (err) {
  assert.ifError(err);

  var leaked = process._getActiveHandles().filter(function (handle) {
    return handle && handle.timeout > 0;
  });

  assert.equal(leaked.length, 0);
});

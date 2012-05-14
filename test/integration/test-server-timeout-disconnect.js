var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.query('SET wait_timeout = 1');

var err;
connection.on('error', function(_err) {
  err = _err;
});

process.on('exit', function() {
  assert.strictEqual(err.code, 'PROTOCOL_CONNECTION_LOST');
  assert.strictEqual(err.fatal, true);
});

var common     = require('../common');
var connection = common.createConnection({password: 'INVALID PASSWORD'});
var assert     = require('assert');

var closeErr;
connection.on('close', function(err) {
  assert.equal(closeErr, undefined);
  closeErr = err;
});

var connectErr;
connection.connect(function(err) {
  assert.equal(connectErr, undefined);
  connectErr = err;
});

process.on('exit', function() {
  assert.equal(closeErr.code, 'ER_ACCESS_DENIED_ERROR');
  assert.ok(/access denied/i.test(closeErr.message));

  assert.strictEqual(closeErr, connectErr);
});


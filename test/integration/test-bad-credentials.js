var common     = require('../common');
var connection = common.createConnection({password: 'INVALID PASSWORD'});
var assert     = require('assert');

var err;
connection.connect(function(_err) {
  assert.equal(err, undefined);
  err = _err;
});

process.on('exit', function() {
  assert.ok(/access denied/i.test(err.message));
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
});


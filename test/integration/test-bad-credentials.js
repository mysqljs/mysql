var common     = require('../common');
var connection = common.createConnection({debug: true, password: 'INVALID PASSWORD'});
var assert     = require('assert');

var err;
connection.connect(function(_err) {
  assert.equal(err, undefined);
  err = _err;
});

process.on('exit', function() {
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.ok(/access denied/i.test(err.message));
});


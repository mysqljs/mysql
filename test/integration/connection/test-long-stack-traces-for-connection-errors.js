var common     = require('../../common');
var connection = common.createConnection({port: common.bogusPort});
var assert     = require('assert');

var err;
connection.connect(function(_err) {
  err = _err;
});

process.on('exit', function() {
  assert.ok(err.stack.indexOf(__filename) > 0);
});

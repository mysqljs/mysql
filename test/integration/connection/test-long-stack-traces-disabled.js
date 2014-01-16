var common     = require('../../common');
var connection = common.createConnection({trace: false});
var assert     = require('assert');

var err;
connection.query('invalid sql', function(_err) {
  err = _err;
});

connection.end();

process.on('exit', function() {
  assert.ok(err.stack.indexOf(__filename) < 0);
});

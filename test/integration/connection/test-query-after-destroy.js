var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var err;
connection.connect(function() {
  connection.destroy();

  connection.query('SELECT 1', function(_err) {
    err = _err;
  });
});

process.on('exit', function() {
  assert.equal(err.fatal, false);
  assert.equal(err.code, 'PROTOCOL_ENQUEUE_AFTER_DESTROY');
});

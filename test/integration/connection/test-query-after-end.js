var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var didEnd = false;
connection.connect();
connection.end(function(err) {
  if (err) throw err;

  didEnd = true;
});

var err;
connection.query('SELECT 1', function(_err) {
  assert.equal(didEnd, false);
  err = _err;
});

process.on('exit', function() {
  assert.equal(didEnd, true);
  assert.equal(err.code, 'PROTOCOL_ENQUEUE_AFTER_QUIT');
  assert.equal(err.fatal, false);
});

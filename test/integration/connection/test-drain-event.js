var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();

var got_drain = false;

connection.on('drain', function() {
  got_drain = true;
});

connection.query("SELECT 1", function(err) {
  assert.equal(got_drain, false);
  assert.ok(!err);
  process.nextTick(function() {
    assert.equal(got_drain, true);
    connection.end();
  });
});

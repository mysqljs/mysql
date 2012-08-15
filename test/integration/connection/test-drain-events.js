var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();

var gotDrain = false;

connection.on('drain', function() {
  gotDrain = true;
});

connection.query("SELECT 1", function(err) {
  // drain is not emitted until after the callback completes
  assert.equal(gotDrain, false);
  assert.ok(!err);
  process.nextTick(function() {
    assert.equal(gotDrain, true);
    connection.end()
  })
})


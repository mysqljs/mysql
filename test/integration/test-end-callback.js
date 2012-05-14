var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();

var gotClose = false;
connection.on('close', function(err) {
  assert.equal(gotClose, false);
  assert.ok(!err);

  gotClose = true;
});

var gotCallback = false;
connection.end(function(err) {
  if (err) throw err;

  assert.equal(gotCallback, false);
  gotCallback = true;
});

process.on('exit', function() {
  assert.equal(gotCallback, true);
  assert.equal(gotClose, true);
});


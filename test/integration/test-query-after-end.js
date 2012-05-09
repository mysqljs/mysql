var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

var didEnd = false;
connection.connect();
connection.end(function(err) {
  didEnd = true;
});

connection.query('SELECT 1', function(err) {
  console.log(err);
  assert.equal(didEnd, false);
  assert.ok(/quit/.test(err.message));
});

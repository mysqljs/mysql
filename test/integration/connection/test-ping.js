var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var pingErr;

connection.ping(function(err) {
  pingErr = err;
});

connection.end();

process.on('exit', function() {
  assert.equal(pingErr, null);
});

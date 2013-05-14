var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var pool       = common.createPool();

var connectionEventHappened = false;
pool.on('connection', function(connection) {
  connectionEventHappened = true;
})

pool.getConnection(function(err, connection) {
  if (err) throw err;
  assert.equal(connectionEventHappened, true);
  pool.end();
});
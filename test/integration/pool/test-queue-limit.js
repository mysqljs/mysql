var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool({
  connectionLimit    : 1,
  queueLimit         : 1,
  waitForConnections : true
});

// First connection we get right away
pool.getConnection(function(err, connection) {
  connection.release()
})

// Second connection request goes into the queue
pool.getConnection(function(err, connection) {
  connection.release()
  pool.end()
})

// Third connection request gets refused, since the queue is full
var thirdGetErr
pool.getConnection(function(err, connection) {
  thirdGetErr = err
})

process.on('exit', function() {
  assert.equal(thirdGetErr.message, 'Queue limit reached.')
})

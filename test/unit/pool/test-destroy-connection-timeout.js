
var assert     = require('assert');
var common     = require('../../common');
var Connection = common.Connection;
var pool       = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);
  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    process.nextTick(function() {
      // Anything enqueued to the connection after this point cannot possibly
      // be handled, and would keep the event loop alive until it times out.
      connection.once('enqueue', function () {
        throw new Error('PoolConnection.destroy should not enqueue anything');
      })
      connection.destroy();
      pool.end(function (err) {
        assert.ifError(err);
        server.destroy();
      })
    })
  })
});

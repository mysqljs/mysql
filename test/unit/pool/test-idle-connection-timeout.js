var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  port                  : common.fakeServerPort,
  idleConnectionTimeout : 100
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.once('release', function(connection) {
    assert.ok(connection);
    setTimeout(function() {
      assert.equal(connection.state, 'disconnected');
      pool.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    }, 200);
  });

  pool.getConnection(function (err, firstConnection) {
    assert.ifError(err);
    assert.ok(firstConnection);
    setTimeout(function() {
      pool.getConnection(function (err, connection) {
        assert.ifError(err);
        assert.equal(connection.state, 'authenticated');
        assert.equal(connection._idleTimeout, null);
        assert.equal(firstConnection, connection);
        connection.release();
      });
    }, 75);
    firstConnection.release();
  });
});

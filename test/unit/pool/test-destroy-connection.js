var assert     = require('assert');
var common     = require('../../common');
var Connection = common.Connection;
var pool       = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert.strictEqual(connection, pool._connectionManager._allConnections._map[1]);
    connection.destroy();

    assert.strictEqual(pool._connectionManager._allConnections.size(), 0);
    assert.ok(!connection._pool);

    assert.doesNotThrow(function () { connection.release(); });

    server.destroy();
  });
});

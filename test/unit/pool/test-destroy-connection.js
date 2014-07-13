var assert     = require('assert');
var common     = require('../../common');
var Connection = common.Connection;
var pool       = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert.strictEqual(connection, pool._allConnections[0]);
    connection.destroy();

    assert.ok(pool._allConnections.length == 0);
    assert.ok(!connection._pool);

    assert.doesNotThrow(function () { connection.release(); });

    server.destroy();
  });
});

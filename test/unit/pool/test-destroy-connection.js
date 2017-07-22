var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert.strictEqual(connection, pool._manager._allConnection.get(connection.getId()));
    connection.destroy();

    assert.equal(pool.getStatus().all, 0);
    assert.equal(connection._pool, null);

    assert.doesNotThrow(function () { connection.release(); });

    server.destroy();
  });
});

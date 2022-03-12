var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert.strictEqual(connection, pool._allConnections[0]);
    connection.destroy();

    assert.strictEqual(pool._allConnections.length, 0);
    assert.ok(!connection._pool);

    assert.doesNotThrow(function () { connection.release(); });

    server.destroy();
  });
});

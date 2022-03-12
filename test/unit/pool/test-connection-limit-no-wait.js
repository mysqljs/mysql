var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({
    connectionLimit    : 1,
    port               : server.port(),
    waitForConnections : false
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);

    pool.getConnection(function (err) {
      assert.ok(err);
      assert.equal(err.message, 'No connections available.');
      assert.equal(err.code, 'POOL_CONNLIMIT');

      connection.destroy();
      server.destroy();
    });
  });
});

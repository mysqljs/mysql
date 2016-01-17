var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit    : 1,
  port               : common.fakeServerPort,
  waitForConnections : false
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

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

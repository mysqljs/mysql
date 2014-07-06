var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  user: 'user_1',
  port: common.fakeServerPort
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  assert.strictEqual(pool.config.connectionConfig.user, 'user_1');

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.config.user, 'user_1');

    conn.changeUser({user: 'user_2'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(conn.config.user, 'user_2');
      assert.strictEqual(pool.config.connectionConfig.user, 'user_1');

      conn.destroy();
      server.destroy();
    });
  });
});

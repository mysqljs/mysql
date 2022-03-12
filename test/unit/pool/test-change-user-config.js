var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({
    user : 'user_1',
    port : server.port()
  });

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

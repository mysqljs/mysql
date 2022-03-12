var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 2,
  restoreNodeTimeout   : 100
});
var server  = common.createFakeServer();

var connCount = 0;
var offline   = true;

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('MASTER', poolConfig);

  cluster.getConnection('MASTER', function (err) {
    assert.ok(err);
    assert.equal(err.code, 'PROTOCOL_CONNECTION_LOST');
    assert.equal(err.fatal, true);
    assert.equal(connCount, 2);

    cluster.getConnection('MASTER', function (err) {
      assert.ok(err);
      assert.equal(err.code, 'POOL_NONEONLINE');

      offline = false;
    });

    setTimeout(function () {
      cluster.getConnection('MASTER', function (err, conn) {
        assert.ifError(err);

        conn.release();

        cluster.end(function (err) {
          assert.ifError(err);
          server.destroy();
        });
      });
    }, 200);
  });
});

server.on('connection', function (conn) {
  connCount += 1;

  if (offline) {
    conn.destroy();
  } else {
    conn.handshake();
  }
});

var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 2,
  restoreNodeTimeout   : 100
});
var server  = common.createFakeServer();

var connCount     = 0;
var offline       = true;
var offlineEvents = 0;
var onlineEvents  = 0;
var poolConfig    = common.getTestConfig({port: common.fakeServerPort});
cluster.add('MASTER', poolConfig);

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  cluster.on('offline', function (id) {
    assert.equal(++offlineEvents, 1);
    assert.equal(id, 'MASTER');
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
      });
    }, 200);
  });

  cluster.on('online', function (id) {
    assert.equal(++onlineEvents, 1);
    assert.equal(id, 'MASTER');
    assert.equal(connCount, 3);

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

  cluster.getConnection('MASTER', function (err) {
    assert.ok(err);
    assert.equal(err.code, 'PROTOCOL_CONNECTION_LOST');
    assert.equal(err.fatal, true);
    assert.equal(connCount, 2);
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

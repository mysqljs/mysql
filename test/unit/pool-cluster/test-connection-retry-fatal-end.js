var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 1
});

var connCount  = 0;
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
var server     = common.createFakeServer();
cluster.add('MASTER', poolConfig);

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  cluster.getConnection('MASTER', function (err) {
    assert.ifError(err);

    cluster.getConnection('MASTER', function (err) {
      assert.ok(err);

      cluster.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    });
  });
});

server.on('connection', function (conn) {
  connCount += 1;

  if (connCount < 2) {
    conn.handshake();
  } else {
    conn.destroy();
    server.destroy();
  }
});

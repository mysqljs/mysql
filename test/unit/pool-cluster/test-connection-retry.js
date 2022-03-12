var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 5
});

var connCount = 0;
var server    = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('MASTER', poolConfig);

  cluster.getConnection('MASTER', function (err, connection) {
    assert.ifError(err);
    assert.equal(connCount, 2);
    assert.equal(connection._clusterId, 'MASTER');

    connection.release();

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

server.on('connection', function (conn) {
  connCount += 1;

  if (connCount < 2) {
    conn.destroy();
  } else {
    conn.handshake();
  }
});

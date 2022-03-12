var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 5
});

var connCount = 0;
var server1   = common.createFakeServer();
var server2   = common.createFakeServer();

server1.listen(0, function (err) {
  assert.ifError(err);

  server2.listen(0, function (err) {
    assert.ifError(err);

    cluster.add('SLAVE1', common.getTestConfig({port: server1.port()}));
    cluster.add('SLAVE2', common.getTestConfig({port: server2.port()}));

    var pool = cluster.of('SLAVE*', 'RR');

    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      assert.equal(connCount, 2);
      assert.equal(connection._clusterId, 'SLAVE2');

      connection.release();

      cluster.end(function (err) {
        assert.ifError(err);
        server1.destroy();
        server2.destroy();
      });
    });
  });
});

server1.on('connection', function (conn) {
  connCount += 1;
  conn.destroy();
});

server2.on('connection', function (conn) {
  connCount += 1;
  conn.handshake();
});

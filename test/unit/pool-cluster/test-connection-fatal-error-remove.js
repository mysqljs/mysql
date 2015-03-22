var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({removeNodeErrorCount: 1});

var server = common.createFakeServer();
cluster.add('MASTER', common.getTestConfig({
  acquireTimeout : 100,
  port           : common.fakeServerPort
}));

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var pool = cluster.of('*', 'RR');

  pool.getConnection(function (err, connection) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
    assert.equal(err.fatal, true);

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

server.on('connection', function () {
  // Let connection time out
});

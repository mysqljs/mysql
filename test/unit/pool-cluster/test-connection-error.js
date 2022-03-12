var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 5
});
var server  = common.createFakeServer();

var connCount = 0;

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('MASTER', poolConfig);

  cluster.getConnection('MASTER', function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    assert.equal(err.fatal, true);
    assert.equal(connCount, 5);

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

server.on('connection', function(incomingConnection) {
  connCount += 1;
  incomingConnection.deny();
});

var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({
  canRetry             : true,
  removeNodeErrorCount : 5
});
var server  = common.createFakeServer();

var connCount  = 0;
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('MASTER', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  cluster.getConnection('MASTER', function(err, conn){
    assert.ok(err);
    assert.equal(err.code, 'ER_HOST_NOT_PRIVILEGED');
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
  incomingConnection.deny('You suck.', common.Errors.ER_HOST_NOT_PRIVILEGED);
});

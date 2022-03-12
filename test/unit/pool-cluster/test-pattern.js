var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('MASTER', poolConfig);
  cluster.add('SLAVE', poolConfig);
  cluster.add('SLAVE1', poolConfig);
  cluster.add('SLAVE2', poolConfig);

  cluster.getConnection('SLAVE4', function (err) {
    assert.ok(err);
    assert.equal(err.message, 'Pool does not exist.');

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

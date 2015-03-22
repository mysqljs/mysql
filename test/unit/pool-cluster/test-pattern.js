var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('MASTER', poolConfig);
cluster.add('SLAVE' , poolConfig);
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  cluster.getConnection('SLAVE4', function(err, conn){
    assert.ok(err);
    assert.equal(err.message, 'Pool does not exist.');

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

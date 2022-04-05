var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var pool = cluster.of('SLAVE*', 'ORDER');

  pool.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['1'], 1);

    pool.query('SELECT 2', function (err, rows) {
      assert.ifError(err);
      assert.equal(rows.length, 1);
      assert.equal(rows[0]['2'], 2);
    });

    cluster.end({
      gracefulExit: true
    }, function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('SLAVE1', poolConfig);
  cluster.add('SLAVE2', poolConfig);

  var pool = cluster.of('SLAVE*', 'ORDER');

  pool.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['1'], 1);

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

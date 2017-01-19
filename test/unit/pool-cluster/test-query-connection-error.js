var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
// cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var pool = cluster.of('SLAVE*', 'ORDER');

  pool.query('SELECT 1', function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'ER_HOST_NOT_PRIVILEGED');
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.deny('You suck.', common.Errors.ER_HOST_NOT_PRIVILEGED);
});

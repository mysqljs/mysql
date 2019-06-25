var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var query = pool.query('SELECT 1');

  query.on('error', function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    assert.equal(err.fatal, true);
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.deny();
});

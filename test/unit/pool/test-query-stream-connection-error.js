var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var query = pool.query('SELECT 1');

  query.on('error', function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'ER_HOST_NOT_PRIVILEGED');
    assert.equal(err.fatal, true);
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.deny('You suck.', common.Errors.ER_HOST_NOT_PRIVILEGED);
});

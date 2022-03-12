var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.query('SELECT 1', function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    assert.equal(err.fatal, true);
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.deny();
});

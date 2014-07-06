var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var wait = 2;
  function done() {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  }

  pool.on('connection', function (connection) {
    assert.ok(connection);
    if (!--wait) return done();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    connection.release();
    if (!--wait) return done();
  });
});

var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(2, function () {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

  pool.on('connection', function (connection) {
    assert.ok(connection);
    done();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    connection.release();
    done();
  });
});

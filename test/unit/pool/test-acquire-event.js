var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(4, function () {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

  pool.on('acquire', function (connection) {
    assert.ok(connection);
    done();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    pool.acquireConnection(connection, function (err, conn) {
      assert.ifError(err);
      assert.ok(conn);
      conn.release();
      done();
    });
    done();
  });

});

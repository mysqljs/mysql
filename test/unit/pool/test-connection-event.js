var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

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

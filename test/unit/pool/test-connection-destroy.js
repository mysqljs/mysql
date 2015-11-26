var assert     = require('assert');
var common     = require('../../common');
var Connection = common.Connection;
var pool       = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.notEqual(connection.state, 'disconnected');

    connection.on('enqueue', function () {
      throw new Error('Unexpected sequence enqueued after connection destroy');
    });

    connection.destroy();
    assert.equal(connection.state, 'disconnected');

    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

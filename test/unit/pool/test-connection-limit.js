var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort
});

var index  = 0;
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    assert.equal(++index, 1);

    pool.getConnection(function (err) {
      assert.ifError(err);
      assert.equal(++index, 3);

      connection.destroy();
      server.destroy();
    });

    process.nextTick(function () {
      assert.equal(++index, 2);
      connection.release();
    });
  });
});

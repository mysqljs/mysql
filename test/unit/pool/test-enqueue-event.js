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

  var count = 0;
  pool.on('enqueue', function () {
    count++;
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    assert.equal(++index, 1);
    assert.equal(count, 0);

    pool.getConnection(function (err) {
      assert.ifError(err);
      assert.equal(++index, 2);
      assert.equal(count, 2);

      connection.release();
    });

    pool.getConnection(function (err) {
      assert.ifError(err);
      assert.equal(++index, 3);
      assert.equal(count, 2);

      connection.destroy();
      server.destroy();
    });

    process.nextTick(function () {
      assert.equal(count, 2);
      connection.release();
    });
  });
});

var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({connectionLimit: 1, port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, conn) {
    assert.ifError(err);

    pool.query('invalid sql', function (err) {
      assert.ok(err, 'got error');
      assert.ok(err.stack.indexOf(__filename) > 0);

      pool.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    });

    process.nextTick(function() {
      conn.release();
    });
  });
});

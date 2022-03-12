var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({connectionLimit: 1, port: server.port(0)});

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

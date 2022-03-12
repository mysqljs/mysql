var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({
    connectionLimit    : 1,
    port               : server.port(),
    waitForConnections : false
  });

  pool.getConnection(function (err, conn) {
    assert.ifError(err);

    conn.query('SELECT INVALID');
    conn.on('error', function () {
      pool.getConnection(function (err) {
        assert.ok(err);
        assert.equal(err.message, 'No connections available.');

        conn.release();
        pool.end(function (err) {
          assert.ifError(err);
          server.destroy();
        });
      });
    });
  });
});

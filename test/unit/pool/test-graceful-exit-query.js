var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool({
  connectionLimit    : 2,
  port               : common.fakeServerPort,
  queueLimit         : 5,
  waitForConnections : true
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, conn) {
    assert.ifError(err);

    pool.getConnection(function (err, conn2) {
      assert.ifError(err);

      pool.query('SELECT 1', function (err, rows) {
        assert.ifError(err);
        assert.equal(rows.length, 1);
        assert.equal(rows[0]['1'], 1);
      });

      pool.end({
        gracefulExit: true
      }, function (err) {
        assert.ifError(err);
        server.destroy();
      });

      conn.release();
      conn2.release();
    });
  });
});

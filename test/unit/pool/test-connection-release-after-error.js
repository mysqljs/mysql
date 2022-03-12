var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

process.on('uncaughtException', function (err) {
  if (err.code !== 'ER_PARSE_ERROR') throw err;
});

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.getConnection(function (err, conn) {
    assert.ifError(err);

    var query = conn.query('SELECT INVALID');

    query.on('end', function () {
      conn.release();
      pool.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    });
  });
});

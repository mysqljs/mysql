var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  startConnections : 2
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function(err, conn) {
    assert.ifError(err);

    assert.deepEqual(pool.getStatus(), {
      all : 2,
      use : 1,
      spare : 1,
      waiting : 0
    });

    conn.release();

    assert.deepEqual(pool.getStatus(), {
      all : 2,
      use : 0,
      spare : 2,
      waiting : 0
    });

    server.destroy();
  });
});

var assert = require('assert');
var common = require('../../common');

var pool = common.createPool({
  connectionLimit : 2,
  port            : common.fakeServerPort,
  maxIdle         : 1
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    setTimeout(function() {
      connection.release();
    }, 1000);
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    setTimeout(function() {
      connection.release();
    }, 1000);
  });

  setTimeout(function() {
    assert.deepEqual(pool.getStatus(), {
      all   : 2,
      use   : 2,
      idle  : 0,
      queue : 0
    });
  }, 500);

  setTimeout(function() {
    assert.deepEqual(pool.getStatus(), {
      all   : 1,
      use   : 0,
      idle  : 1,
      queue : 0
    });

    pool.end(function() {
      server.destroy();
    });
  }, 1500);
});

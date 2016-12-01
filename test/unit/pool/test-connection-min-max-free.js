var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  minSpareConnections : 2,
  maxSpareConnections : 3,
  spareCheckInterval : 200
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  setTimeout(function() {
    // check for minSpareConnections
    assert.deepEqual(pool.getStatus(), {
      all : 2,
      use : 0,
      spare : 2,
      waiting : 0
    });

    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      setTimeout(function() {
        connection.release();
      }, 500);
    });

    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      setTimeout(function() {
        connection.release();

        // check for minSpareConnections
        assert.deepEqual(pool.getStatus(), {
          all : 4,
          use : 0,
          spare : 4,
          waiting : 0
        });

        // check for maxSpareConnections
        setTimeout(function() {
          assert.deepEqual(pool.getStatus(), {
            all : 3,
            use : 0,
            spare : 3,
            waiting : 0
          });

          pool.end(function(err) {
            assert.ifError(err);
            server.destroy();
          });
        }, 500);
      }, 500);
    });
  }, 500);
});

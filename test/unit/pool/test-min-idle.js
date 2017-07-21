var assert = require('assert');
var common = require('../../common');

var pool = common.createPool({
  connectionLimit               : 2,
  port                          : common.fakeServerPort,
  minIdle                       : 2,
  timeBetweenEvictionRunsMillis : 1000
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var count = 0;

  pool.on('connection', function() {
    if (++count === 2) {
      setTimeout(function() {
        assert.deepEqual(pool.getStatus(), {
          all   : 2,
          use   : 0,
          idle  : 2,
          queue : 0
        });

        pool.end(function() {
          server.destroy();
        });
      }, 500);
    }
  });
});

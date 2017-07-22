var assert = require('assert');
var common = require('../../common');

var pool = common.createPool({
  port                          : common.fakeServerPort,
  initialSize                   : 3,
  timeBetweenEvictionRunsMillis : 500,
  numTestsPerEvictionRun        : 1,
  minEvictableIdleTimeMillis    : 100
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.on('prepared', function() {
    assert.equal(pool.getStatus().idle, 3);

    var expectedIdle = 2;
    pool.on('eviction', function(result) {
      assert.equal(result.removed, 1);
      assert.equal(pool.getStatus().idle, expectedIdle--);

      if (expectedIdle === 0) {
        pool.end(function() {
          server.destroy();
        });
      }
    });
  });
});

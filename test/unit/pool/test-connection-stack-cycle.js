var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 2,
  port            : common.fakeServerPort,
  stackCycle      : true
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var releasedThreadId = null;
  var releaseCount = 0;

  pool.on('release', function (connection) {
    releaseCount++;
    releasedThreadId = connection.threadId;
  });

  pool.getConnection(function (err, firstConnection) {
    assert.ifError(err);
    assert.ok(firstConnection);

    pool.getConnection(function (err, secondConnection) {
      assert.ifError(err);
      assert.ok(secondConnection);
      firstConnection.release();
      secondConnection.release();
      assert.equal(releaseCount, 2);
      assert.equal(releasedThreadId, secondConnection.threadId);

      pool.getConnection(function (err, recycledConnection) {
        assert.ifError(err);
        assert.ok(recycledConnection);
        assert.equal(recycledConnection.threadId, releasedThreadId);

        pool.end(function (err) {
          assert.ifError(err);
          server.destroy();
        });
      });
    });
  });
});

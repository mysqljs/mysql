var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  port               : common.fakeServerPort,
  connectionLifetime : 100
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);

    setTimeout(function() {
      assert.equal(connection.state, 'disconnected');
      pool.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    }, 200);

  });
});

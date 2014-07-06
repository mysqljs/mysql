var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort
});
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    conn.release();

    try {
      conn.release();
    } catch (e) {
      err = e;
    }

    assert.ok(err);
    server.destroy();
  });
});

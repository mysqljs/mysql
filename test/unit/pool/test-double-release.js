var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({
    connectionLimit : 1,
    port            : server.port()
  });

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

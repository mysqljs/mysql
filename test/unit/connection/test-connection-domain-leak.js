var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var domain = null;

try {
  domain = require('domain');
} catch (e) {
  common.skipTest('node ' + process.version + ' does not support domains');
}

var d0 = domain.create();

var server = common.createFakeServer();

var done = after(2, function () {
  server.destroy();
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  d0.run(function () {
    var conn = common.createConnection({port: common.fakeServerPort});
    assert.equal(conn.domain, d0, 'connection is bound to domain d0');
    conn.query('SELECT 1', function(err) {
      assert.ifError(err);
      assert.equal(d0.members.length, 0, 'socket is not added to domain d0 members');
      conn.destroy();
      done();
    });

    var pool = common.createPool({port: common.fakeServerPort, connectionLimit: 1});
    pool.getConnection(function (err, conn) {
      assert.ifError(err);
      assert.equal(conn.domain, d0, 'connection is bound to domain d0');
      assert.equal(d0.members.length, 0, 'socket is not added to domain d0 members');
      conn.release();
      pool.end(function (err) {
        assert.ifError(err);
        done();
      });
    });
  });
});

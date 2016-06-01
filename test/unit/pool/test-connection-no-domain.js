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

var pool = null;
var done = after(2, function () {
  pool.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var released = false;
  var timer    = setInterval(function () {
    if (!released) return;
    clearInterval(timer);

    assert.ok(!domain.active, 'no current domain');
    pool.getConnection(function (err, conn) {
      assert.ifError(err);
      assert.ok(!domain.active, 'no current domain');
      assert.equal(conn.domain, null, 'connection is not bound to domain');
      conn.release();
      done();
    });
  }, 200);

  pool = common.createPool({port: common.fakeServerPort, connectionLimit: 1});
  assert.equal(pool.domain, null, 'pool is not bound to domain');

  d0.run(function () {
    pool.getConnection(function (err, conn) {
      assert.ifError(err);
      assert.equal(domain.active, d0, 'current domain is d0');
      assert.equal(conn.domain, null, 'connection is not bound to domain');
      conn.release();
      released = true;
      done();
    });
  });
});

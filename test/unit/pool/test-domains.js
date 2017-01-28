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
var d1 = domain.create();
var d2 = domain.create();
var d3 = domain.create();

var pool;
var server = common.createFakeServer();

var done = after(4, function () {
  pool.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  d0.run(function () {
    pool = common.createPool({connectionLimit: 1, port: common.fakeServerPort});

    d1.run(function () {
      pool.getConnection(function (err, connection) {
        assert.ifError(err);

        d2.run(function () {
          pool.query('SELECT 2', function (err) {
            assert.ifError(err);
            throw new Error('inside domain 2');
          });
        });

        connection.release();
        throw new Error('inside domain 1');
      });
    });

    d3.run(function () {
      pool.getConnection(function (err, connection) {
        assert.ifError(err);
        connection.release();
        throw new Error('inside domain 3');
      });
    });

    setTimeout(function() {
      throw new Error('inside domain 0');
    }, 100);

    d2.on('error', function (err) {
      assert.equal(err.toString(), 'Error: inside domain 2');
      done();
    });
    d3.on('error', function (err) {
      assert.equal(err.toString(), 'Error: inside domain 3');
      done();
    });
  });
});

d0.on('error', function (err) {
  assert.equal(err.toString(), 'Error: inside domain 0');
  done();
});

d1.on('error', function (err) {
  assert.equal(err.toString(), 'Error: inside domain 1');
  done();
});

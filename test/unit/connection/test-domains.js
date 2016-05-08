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
var d4 = domain.create();

var server = common.createFakeServer();

var done = after(4, function () {
  server.destroy();
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  d0.run(function () {
    var connection = common.createConnection({port: common.fakeServerPort});

    d1.run(function () {
      connection.connect(function (err) {
        assert.ifError(err);
        throw new Error('inside domain 1');
      });
    });

    d2.run(function () {
      connection.query('SELECT 1', function (err) {
        assert.ifError(err);
        throw new Error('inside domain 2');
      });
    });

    d3.run(function() {
      connection.ping(function (err) {
        assert.ifError(err);
        throw new Error('inside domain 3');
      });
    });

    connection.end(assert.ifError);

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

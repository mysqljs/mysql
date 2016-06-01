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

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var connection = null;
  var timer      = setInterval(function () {
    if (connection.state !== 'authenticated') return;
    clearInterval(timer);

    assert.ok(!domain.active, 'no current domain');
    connection.query('SELECT 1', function (err) {
      assert.ifError(err);
      assert.equal(domain.active, d0, 'current domain is d0');

      connection.destroy();
      server.destroy();
    });
  }, 200);

  d0.run(function () {
    connection = common.createConnection({port: common.fakeServerPort});
    assert.equal(connection.domain, d0, 'connection belongs to d0');

    d1.run(function () {
      connection.connect(function (err) {
        assert.ifError(err);
        assert.equal(domain.active, d1, 'current domain is d1');
      });
    });
  });
});

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

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  d0.run(function () {
    var members = d0.members.slice(0);
    var conn    = common.createConnection({port: common.fakeServerPort});

    assert.equal(conn.domain, d0, 'connection is bound to domain d0');
    assert.equal(d0.members.indexOf(conn), -1, 'connection is not an explicit member of domain d0');
    assert.deepEqual(d0.members, members, 'no members added to domain d0');

    conn.query('SELECT 1', function (err) {
      assert.ifError(err);
      assert.deepEqual(d0.members, members, 'no members added to domain d0');
      conn.destroy();
      server.destroy();
    });
  });
});

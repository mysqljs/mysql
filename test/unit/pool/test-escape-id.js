var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  assert.equal(pool.escapeId('id'), '`id`');

  pool.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

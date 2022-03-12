var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  assert.equal(pool.escapeId('id'), '`id`');

  pool.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

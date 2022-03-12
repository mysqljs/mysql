var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

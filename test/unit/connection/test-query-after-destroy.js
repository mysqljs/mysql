var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});
  var sync       = true;

  connection.destroy();

  connection.query('SELECT 1', function (err) {
    assert.ok(!sync);
    assert.ok(err);
    assert.equal(err.fatal, false);
    assert.equal(err.code, 'PROTOCOL_ENQUEUE_AFTER_DESTROY');
    server.destroy();
  });

  sync = false;
});

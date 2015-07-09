var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var sync = true;

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

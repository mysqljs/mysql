var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var wait = 2;
  function done() {
    if (--wait) return;
    server.destroy();
  }

  connection.connect(assert.ifError);

  connection.end(function (err) {
    assert.ifError(err);
    done();
  });

  connection.on('error', function (err) {
    assert.ok(err);
    assert.equal(err.fatal, false);
    assert.equal(err.code, 'PROTOCOL_ENQUEUE_AFTER_QUIT');
    done();
  });

  connection.query('SELECT 1');
});

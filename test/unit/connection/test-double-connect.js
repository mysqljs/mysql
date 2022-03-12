var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var done = after(2, function () {
    connection.destroy();
    server.destroy();
  });

  connection.connect(function (err) {
    assert.ifError(err);

    connection.connect(function (err) {
      assert.ok(err, 'got error');
      assert.equal(err.code, 'PROTOCOL_ENQUEUE_HANDSHAKE_TWICE');
      assert.ok(!err.fatal);
      done();
    });
  });

  connection.connect(function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'PROTOCOL_ENQUEUE_HANDSHAKE_TWICE');
    assert.ok(!err.fatal);
    done();
  });
});

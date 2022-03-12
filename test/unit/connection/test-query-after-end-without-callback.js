var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var done = after(2, function () {
    server.destroy();
  });

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

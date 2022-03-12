var assert = require('assert');
var common = require('../../common');

var error  = undefined;
var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var caughtErr  = null;
  var connection = common.createConnection({port: server.port()});

  connection.connect(function (err) {
    assert.ifError(err);

    process.once('uncaughtException', function (err) {
      caughtErr = err;
    });

    throw error;
  });

  connection.end(function (err) {
    process.removeAllListeners('uncaughtException');
    assert.ifError(err);
    assert.strictEqual(caughtErr, error);
    server.destroy();
  });
});

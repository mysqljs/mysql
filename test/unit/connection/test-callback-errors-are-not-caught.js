var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var error  = new Error('uncaught exception');
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var caughtErr = null;

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

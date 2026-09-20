var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

var callbackErr = null;
var uncaughtErr = null;
var timeout = null;

process.once('uncaughtException', function (err) {
  uncaughtErr = err;
  finish();
});

function finish() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  try {
    server.destroy();
  } catch (err) {
    // ignore
  }
}

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.connect(function (err) {
    assert.ifError(err);

    var socket = connection._socket;
    socket.write = function write() {
      var writeErr = new Error('write EPIPE');
      writeErr.code = 'EPIPE';
      writeErr.errno = 'EPIPE';
      writeErr.syscall = 'write';
      throw writeErr;
    };

    connection.query('SELECT 1', function (err) {
      callbackErr = err;
      connection.destroy();
      finish();
    });

    timeout = setTimeout(function () {
      connection.destroy();
      finish();
    }, 1000);
  });
});

process.on('exit', function () {
  assert.ok(callbackErr, 'write EPIPE should be forwarded to the query callback');
  assert.equal(callbackErr.code, 'EPIPE');
  assert.equal(callbackErr.syscall, 'write');
  assert.equal(callbackErr.fatal, true);
  assert.strictEqual(uncaughtErr, null, 'write EPIPE must not become an uncaught exception when a callback is attached');
});

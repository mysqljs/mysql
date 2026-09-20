var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

var callbackErr = null;
var connectionErr = null;
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

    connection.query('SELECT 1', function (err) {
      callbackErr = err;

      // Fire after the query sequence has been dequeued so this matches the
      // leftover write from a too-large payload after the server already replied.
      process.nextTick(function () {
        var writeErr = new Error('write EPIPE');
        writeErr.code = 'EPIPE';
        writeErr.errno = 'EPIPE';
        writeErr.syscall = 'write';
        connection._handleNetworkError(writeErr);

        process.nextTick(function () {
          connection.destroy();
          finish();
        });
      });
    });

    timeout = setTimeout(function () {
      connection.destroy();
      finish();
    }, 1000);
  });
});

process.on('exit', function () {
  assert.ifError(callbackErr);
  assert.strictEqual(uncaughtErr, null, 'late write EPIPE must not crash the process after a query callback ran');
  assert.strictEqual(connectionErr, null);
});

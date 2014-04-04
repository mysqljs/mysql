var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var assert     = require('assert');

var server = common.createFakeServer();

var connectErr;
var finalErr;
var queryErr1;
var queryErr2;
var queryErr3;
var timeout;
server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;
  var waitCount = 4;

  connection.connect(function(err) {
    connectErr = err;
    if (!--waitCount) end();
  });

  connection.query('SELECT 1', function(err) {
    queryErr1 = err;
    connection.query('SELECT 1', function(err) {
      finalErr = err;
      if (!--waitCount) end();
    });
  });

  process.nextTick(function() {
    connection.query('SELECT 1', function(err) {
      queryErr2 = err;
      if (!--waitCount) end();
    });
  });

  setTimeout(function() {
    connection.query('SELECT 1', function(err) {
      queryErr3 = err;
      if (!--waitCount) end();
    });
  }, 200);

  timeout = setTimeout(end, 2000);
});

function end() {
  if (timeout) clearTimeout(timeout);
  server.destroy();
}

server.on('connection', function(incomingConnection) {
  var errno = 1130; // ER_HOST_NOT_PRIVILEGED
  incomingConnection.deny('You suck.', errno);
});

process.on('exit', function() {
  assert.ok(connectErr);
  assert.ok(queryErr1);
  assert.ok(queryErr2);
  assert.ok(queryErr3);
  assert.ok(finalErr);
  assert.equal(finalErr.code, 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR');
});

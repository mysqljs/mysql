var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();
var connection;
var queryReceived = false;

server.listen(0, function (err) {
  assert.ifError(err);

  connection = common.createConnection({port: server.port()});
  connection.query({sql: 'SELECT 1', timeout: 1000}, function () {
    throw new Error('Unexpected query callback after destroy');
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('query', function () {
    queryReceived = true;
    connection.destroy();
    server.destroy();
  });
});

process.on('exit', function () {
  assert.ok(queryReceived);
});

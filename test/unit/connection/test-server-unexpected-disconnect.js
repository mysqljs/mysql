var assert = require('assert');
var common = require('../../common');

var endErr   = null;
var queryErr = null;
var server   = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.on('end', function (err) {
    assert.ok(!endErr);
    endErr = err;
  });

  connection.query('SELECT 1', function(err) {
    assert.ok(!queryErr);
    queryErr = err;
  });
});

server.on('connection', function(connection) {
  connection.handshake();

  connection.on('query', function () {
    server.destroy();
  });
});

process.on('exit', function() {
  assert.strictEqual(queryErr.code, 'PROTOCOL_CONNECTION_LOST');
  assert.strictEqual(queryErr.fatal, true);

  assert.strictEqual(endErr, queryErr);
});

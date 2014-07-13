var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var endErr;
connection.on('end', function(err) {
  assert.ok(!endErr);
  endErr = err;
});

var queryErr;

var server = common.createFakeServer();
server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.query('SELECT 1', function(err) {
    assert.ok(!queryErr);
    queryErr = err;
  });
});

server.on('connection', function(connection) {
  connection.handshake();

  connection.on('query', function(packet) {
    server.destroy();
  });
});

process.on('exit', function() {
  assert.strictEqual(queryErr.code, 'PROTOCOL_CONNECTION_LOST');
  assert.strictEqual(queryErr.fatal, true);

  assert.strictEqual(endErr, queryErr);
});

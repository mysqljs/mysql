var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();
var queryCompleted = false;

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query('SELECT 1', function (err) {
    assert.ifError(err);
    queryCompleted = true;
    connection.destroy();
    server.destroy();
  });

  connection.query({sql: 'SELECT 2', timeout: 1000}, function () {
    throw new Error('Unexpected queued query callback after destroy');
  });
});

process.on('exit', function () {
  assert.ok(queryCompleted);
});

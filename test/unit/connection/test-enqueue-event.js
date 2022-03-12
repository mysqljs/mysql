var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});
  var count      = 0;

  connection.on('enqueue', function () {
    count++;
  });

  connection.on('drain', function () {
    assert.equal(count, 3);
    connection.destroy();
    server.destroy();
  });

  connection.query('SELECT 1', assert.ifError);
  connection.ping(assert.ifError);
});


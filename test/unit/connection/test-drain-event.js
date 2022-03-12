var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.on('drain', function () {
    connection.destroy();
    server.destroy();
  });

  connection.query('SELECT 1', assert.ifError);
});


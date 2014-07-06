var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.on('drain', function () {
    connection.destroy();
    server.destroy();
  });

  connection.query('SELECT 1', assert.ifError);
});


var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({keepAliveDelay: 60000, port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.on('connect', function () {
    connection.destroy();
    server.destroy();
  });

  connection.connect(assert.ifError);
});

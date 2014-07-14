var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var count = 0;
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


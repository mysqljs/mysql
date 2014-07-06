var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({connectTimeout: 2000, port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('SELECT SLEEP(3)', function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [{'SLEEP(3)': 0}]);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (conn) {
  setTimeout(function () {
    conn.handshake();
  }, 400);
});

var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);

    connection.destroy();
    server.destroy();
  });
});

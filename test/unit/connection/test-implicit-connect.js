var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);

    connection.destroy();
    server.destroy();
  });
});

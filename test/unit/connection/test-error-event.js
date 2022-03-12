var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query('INVALID SQL');

  connection.on('error', function (err) {
    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.ok(!err.fatal);

    connection.destroy();
    server.destroy();
  });
});

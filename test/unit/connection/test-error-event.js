var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('INVALID SQL');

  connection.on('error', function (err) {
    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.ok(!err.fatal);

    connection.destroy();
    server.destroy();
  });
});

var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var query = connection.query('INVALID SQL');

  query.on('error', function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.equal(err.sql, 'INVALID SQL');
    assert.ok(!err.fatal);
    connection.destroy();
    server.destroy();
  });
});

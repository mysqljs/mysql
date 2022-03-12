var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

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

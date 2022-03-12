var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

process.on('uncaughtException', function (err) {
  if (err.code !== 'ER_PARSE_ERROR') throw err;
});

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var query = connection.query('SELECT INVALID');

  query.on('end', function () {
    connection.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

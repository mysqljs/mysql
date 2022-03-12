var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

process.on('uncaughtException', function (err) {
  if (err.code !== 'ER_PARSE_ERROR') throw err;
});

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  var query = pool.query('SELECT INVALID');

  query.on('end', function () {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

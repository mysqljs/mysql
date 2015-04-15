var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

process.on('uncaughtException', function (err) {
  if (err.code !== 'ER_PARSE_ERROR') throw err;
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var query = pool.query('SELECT INVALID');

  query.on('end', function () {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

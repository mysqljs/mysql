var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  assert.throws(function () {
    connection.query('SELECT ?', [1], 'oops');
  }, /TypeError: argument callback must be a function when provided/);

  assert.throws(function () {
    connection.query({ sql: 'SELECT ?' }, [1], 'oops');
  }, /TypeError: argument callback must be a function when provided/);

  connection.destroy();
  server.destroy();
});

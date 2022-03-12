var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  assert.throws(function () {
    connection.query('SELECT ?', [1], 'oops');
  }, /TypeError: argument callback must be a function when provided/);

  assert.throws(function () {
    connection.query({ sql: 'SELECT ?' }, [1], 'oops');
  }, /TypeError: argument callback must be a function when provided/);

  connection.destroy();
  server.destroy();
});

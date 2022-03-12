var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var done = after(2, function () {
    server.destroy();
  });

  var query  = connection.query('SELECT * FROM stream LIMIT 2');
  var stream = query.stream();

  stream.once('close', done);

  stream.on('data', function noop() {});

  connection.end(function (err) {
    assert.ifError(err);
    done();
  });
});

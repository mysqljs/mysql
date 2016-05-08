var after      = require('after');
var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(3, function () {
    server.destroy();
  });

  var closed = false;
  var ended  = false;
  var query  = connection.query('SELECT * FROM stream LIMIT 2');
  var stream = query.stream();

  stream.once('close', function () {
    assert.ok(ended);
    closed = true;
    done();
  });

  stream.once('end', function () {
    assert.ok(!closed);
    ended = true;
    done();
  });

  stream.on('data', function noop() {});

  connection.end(function (err) {
    assert.ifError(err);
    done();
  });
});

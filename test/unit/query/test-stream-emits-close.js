var after      = require('after');
var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(2, function () {
    server.destroy();
  });

  var query  = connection.query('SELECT * FROM stream LIMIT 2');
  var stream = query.stream();

  stream.once('close', function () {
    assert(stream._readableState.ended, "Stream was still readable when closed.");
    done();
  });

  stream.on('data', function noop() {});

  connection.end(function (err) {
    assert.ifError(err);
    done();
  });
});

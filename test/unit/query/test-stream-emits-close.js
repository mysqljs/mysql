var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var query  = connection.query('SELECT * FROM stream LIMIT 2');
  var stream = query.stream();
  var wait   = 2;

  function done() {
    if (--wait) return;
    server.destroy();
  }

  stream.once('close', done);

  connection.end(function (err) {
    assert.ifError(err);
    done();
  });
});

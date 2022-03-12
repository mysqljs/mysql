var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var count = 0;
  var query = connection.query('SELECT * FROM stream LIMIT 10');

  query.on('result', function () {
    count++;
    assert.equal(count, 1);
    connection.destroy();

    process.nextTick(function () {
      server.destroy();
    });
  });
});

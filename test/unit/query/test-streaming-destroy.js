var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

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

var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var count = 0;
  var query = connection.query('SELECT * FROM stream LIMIT 10');

  query.on('result', function (row) {
    count++;
    connection.pause();
    connection.resume();
    assert.equal(row.id, count);
    assert.equal(row.title, 'Row #' + count);
  });

  query.on('end', function () {
    assert.equal(count, 10);
    connection.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

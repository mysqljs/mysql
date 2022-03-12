var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

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

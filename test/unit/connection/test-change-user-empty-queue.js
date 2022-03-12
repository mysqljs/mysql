var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);

    // wait till protocol._queue is empty
    connection.once('drain', function() {
      connection.changeUser({user: 'user_1'}, function (err) {
        assert.ifError(err);
        connection.destroy();
        server.destroy();
      });
    });
  });
});

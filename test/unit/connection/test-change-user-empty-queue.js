var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

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

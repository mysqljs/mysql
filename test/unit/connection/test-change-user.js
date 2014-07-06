var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port: common.fakeServerPort,
  user: 'user_1'
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2'}, function (err) {
      assert.ifError(err);

      connection.query('SELECT CURRENT_USER()', function (err, result) {
        assert.ifError(err);
        assert.strictEqual(result[0]['CURRENT_USER()'], 'user_2@localhost');

        connection.destroy();
        server.destroy();
      });
    });
  });
});

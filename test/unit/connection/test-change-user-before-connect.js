var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function(err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    user : 'user_1'
  });

  assert.equal(connection.state, 'disconnected');

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

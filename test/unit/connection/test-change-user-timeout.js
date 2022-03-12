var assert = require('assert');
var common = require('../../common');

var timeout = setTimeout(function () {
  throw new Error('test timeout');
}, 5000);

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    user : 'user_1'
  });

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2', timeout: 1000}, function (err) {
      assert.ok(err);
      assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
      assert.equal(err.message, 'ChangeUser inactivity timeout');

      connection.destroy();
      server.destroy();
      clearTimeout(timeout);
    });
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('changeUser', function () {
    // do nothing
  });
});

var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function(err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port  : server.port(),
    trace : false
  });

  connection.query('invalid sql', function (err) {
    assert.ok(err, 'got error');
    assert.ok(err.stack.indexOf(__filename) < 0);

    connection.destroy();
    server.destroy();
  });
});

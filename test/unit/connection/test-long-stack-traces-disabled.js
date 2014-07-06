var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort, trace: false});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('invalid sql', function (err) {
    assert.ok(err, 'got error');
    assert.ok(err.stack.indexOf(__filename) < 0);

    connection.destroy();
    server.destroy();
  });
});

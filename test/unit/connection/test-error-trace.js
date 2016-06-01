var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('INVALID SQL', function (err) {
    assert.ok(err, 'got error');
    assert.ok(typeof err.stack === 'string', 'error stack is string');
    assert.ok(err.stack.indexOf('\n    --------------------\n') !== -1, 'error stack has delimiter');

    connection.destroy();
    server.destroy();
  });
});

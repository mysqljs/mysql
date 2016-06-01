var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  // Common mistake to leave in code
  Error.prepareStackTrace = function (err, stack) {
    return stack;
  };

  connection.query('INVALID SQL', function (err) {
    assert.ok(err, 'got error');
    assert.ok(typeof err.stack !== 'string', 'error stack is not a string');

    connection.destroy();
    server.destroy();
  });
});

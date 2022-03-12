var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

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

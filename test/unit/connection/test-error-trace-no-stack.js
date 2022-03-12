var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  Error.stackTraceLimit = 0;

  connection.query('INVALID SQL', function (err) {
    assert.ok(err, 'got error');
    assert.ok(!err.stack || err.stack.indexOf('\n    --------------------\n') === -1,
      'error stack does not have delimiter');

    connection.destroy();
    server.destroy();
  });
});

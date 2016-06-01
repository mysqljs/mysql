var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  Error.stackTraceLimit = 0;

  connection.query('INVALID SQL', function (err) {
    assert.ok(err, 'got error');
    assert.ok(!err.stack || err.stack.indexOf('\n    --------------------\n') === -1,
      'error stack does not have delimiter');

    connection.destroy();
    server.destroy();
  });
});

var common = require('../../common');
var assert = require('assert');

var server = common.createFakeServer();

var connectErr;
server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.connect(function(err) {
    connectErr = err;
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.deny('You suck.', common.Errors.ER_HOST_NOT_PRIVILEGED);
});

process.on('exit', function() {
  assert.equal(connectErr.code, 'ER_HOST_NOT_PRIVILEGED');
  assert.ok(/You suck/.test(connectErr.message));
  assert.equal(connectErr.fatal, true);
});

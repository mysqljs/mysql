var assert     = require('assert');
var common     = require('../../common');
var os         = require('os');
var interfaces = os.networkInterfaces();
var external   = Object.keys(interfaces).some(function(name) {
  return interfaces[name].some(function(interface) {
    return !interface.internal;
  });
});

if (!external) {
  common.skipTest('no external network interfaces');
}

var connection = common.createConnection({host: '1.1.1.1', port: common.fakeServerPort, connectTimeout: 500});

var testTimeout = setTimeout(function() {
  connection.destroy();
}, 5000);

var connectErr;
connection.connect(function(err) {
  connectErr = err;
  clearTimeout(testTimeout);
});

process.on('exit', function() {
  assert.ok(connectErr);
  assert.equal(connectErr.code, 'ETIMEDOUT');
  assert.equal(connectErr.syscall, 'connect');
  assert.equal(connectErr.fatal, true);
});

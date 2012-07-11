var common = require('../../common');
var assert = require('assert');
var mysql  = common.mysql;

var server = mysql.createServer(function(connection) {
  connection.greet();

  connection.on('auth', function(auth) {
    connection.deny();
  });
});

var err;
server.listen(common.serverPort, function() {
  var connection = common.createConnection({port: common.serverPort});

  connection.connect(function(_err) {
    err = _err;

    server.close();
  });
});

process.on('exit', function() {
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
});

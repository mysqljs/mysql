var common = require('../../common');
var assert = require('assert');
var mysql  = common.mysql;

var options = {
  user     : 'john',
  password : 'secret',
  port     : common.serverPort,
};

var server = mysql.createServer(function(connection) {
  connection.greet();

  connection.on('auth', function(auth) {
    if (connection.verifyPassword(auth, common.password)) {
      connection.accept();
      return;
    }

    connection.deny();
  });
});


var success = false;
server.listen(options.port, function() {
  var connection = common.createConnection({port: options.port});

  connection.connect(function(err) {
    if(err) throw err;

    server.close();
    connection.end();

    success = true;
  });
});

process.on('exit', function() {
  assert.ok(success);
});

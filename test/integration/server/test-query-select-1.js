var common = require('../../common');
var assert = require('assert');
var mysql  = common.mysql;

var server = mysql.createServer(function(connection) {
  connection.greet();

  connection
    .on('auth', function(auth) {
      connection.accept();
    })
    .on('query', function(query) {
      assert.equal(query.sql, 'SELECT 1');

      // Experimental interface
      connection.results([{
        '1': 1,
      }]);
    });
});


var results;
server.listen(common.serverPort, function() {
  var connection = common.createConnection({port: common.serverPort});

  connection.query('SELECT 1', function(err, _results) {
    if (err) throw err;

    results = _results;
  });

  connection.end(function() {
    server.close();
  });
});

process.on('exit', function() {
  assert.equal(results.length, 1);
  assert.equal(results[0]['1'], 1);
});

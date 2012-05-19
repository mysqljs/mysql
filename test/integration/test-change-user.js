var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

/**
This test assumes there is a db named test on the MySQL server
**/

connection.query("select database() as current_db", function(err, info){
  connection.changeUser({database:'test'}, function(err){
    connection.query("select database() as current_db", function(err, info){
      if (err) throw err;

      assert.equal(info[0]['current_db'], 'test');
      connection.end();
    });
  });
});

connection.on('error', function(err){
  console.log(err);
});

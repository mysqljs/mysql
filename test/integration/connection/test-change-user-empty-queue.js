var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.query('CREATE DATABASE ' + common.testDatabase, function(err) {
  if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;

  // wait till protocol._queue is empty
  setTimeout(function() {
    connection.changeUser({database: common.testDatabase}, function(err) {
      assert.ifError(err);
    });

    connection.end();
  }, 2000);
});

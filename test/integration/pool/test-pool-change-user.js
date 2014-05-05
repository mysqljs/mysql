var common     = require('../../common');
var assert     = require('assert');
var pool       = common.createPool();
var connection = common.createConnection();

var newDatabase = common.testDatabase + '2';

connection.query('CREATE DATABASE IF NOT EXISTS ' + newDatabase, function(err) {
  if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;
  connection.end();
});

pool.getConnection(function (err, firstConn) {
  if (err) throw err;

  firstConn.changeUser({ database: newDatabase }, function (err) {
    if (err) throw err;

    pool.getConnection(function (err, secondConn) {
      if (err) throw err;

      assert.equal(firstConn.config.database, newDatabase);
      assert.notEqual(secondConn.config.database, newDatabase);

      pool.end();
    });
  });

});

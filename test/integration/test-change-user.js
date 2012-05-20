var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.query('CREATE DATABASE ' + common.testDatabase, function(err) {
  if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;
});

var initialDb;
connection.query('select database() as db', function(err, results) {
  if (err) throw err;

  initialDb = results[0].db;
});

connection.changeUser({database: common.testDatabase});

var finalDb;
connection.query('select database() as db', function(err, results){
  if (err) throw err;

  finalDb = results[0].db;
});

connection.end();

process.on('exit', function() {
  assert.equal(initialDb, null);
  assert.equal(finalDb, common.testDatabase);
});

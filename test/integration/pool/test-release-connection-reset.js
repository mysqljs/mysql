var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');

var config = common.getTestConfig({
  connectionLimit: 1
});

var pool       = common.createPool(config);

var callQuery1_2 = false;

pool.getConnection(function(err, connection) {
  if (err) throw err;

  console.log('# getConnection : 1');

  connection.query('SELECT SLEEP(1)', function(err) {
    console.log('> QUERY 1-1');

    // release connection. (logic error occurs)
    connection.end();
  });

  connection.query('SELECT 1', function(err) {
    // must not execute
    callQuery1_2 = true;

    console.log('> QUERY 1-2');
  });
});

pool.getConnection(function(err, connection) {
  if (err) throw err;

  console.log('# getConnection : 2');

  connection.query('SELECT 1', function(err) {
    assert.ok(callQuery1_2 === false);

    console.log('> QUERY 2-1');
    pool.end();
  });
});

var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');

var config = common.getTestConfig({
  connectionLimit: 1,
  maxWait: 1000
});

var pool = common.createPool(config);

pool.getConnection(function (err, connection) {
  if (err === null) {
    setTimeout(function () {
      connection.end();
    }, 2000);
  }
});

pool.getConnection(function (err, connection) {
  pool.end();
  
  if (err !== null) {
    assert.equal(err.toString(), 'Error: Timed out (getConnection)');
  }
});

var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var pool       = common.createPool({
  createConnection: function() {
    var connection = common.createConnection()
    connection.query('SET SESSION sql_mode="STRICT_ALL_TABLES"')
    return connection
  }
});

pool.getConnection(function(err, connection) {
  if (err) throw err;
  pool.end()
});

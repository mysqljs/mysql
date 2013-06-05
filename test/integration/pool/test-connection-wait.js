var common = require('../../common');
var assert = require('assert');

var pool   = common.createPool({
  connectionLimit : 1,
  maxWait: 1
});

pool.getConnection(function(err, connection) {
  pool.end();

  if (err !== null) {
    assert.equal(err.toString(), 'Error: Timed out (DB Connection)');
  }
});

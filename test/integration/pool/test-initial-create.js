var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');

var config = common.getTestConfig({
  initialSize: 2
});

var pool = common.createPool(config);

var createdPoolCnt = 0;
pool.on('connection', function(connection) {
  createdPoolCnt++;
  console.log('# create connection');
});

pool.on('initialized', function(poolSize) {
  assert.equal(createdPoolCnt, poolSize);
  assert.equal(poolSize, pool._allConnections.length());
});

pool.getConnection(function(err, connection) {
  console.log('> getConnection 1 : ' + err);
  pool.end();
});
var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');

var config = common.getTestConfig({
  initialSize: 2
});

var pool = common.createPool(config);

pool.on('initialized', function(poolSize) {
  pool.end(function (err) {
    assert.equal(err, null);
  });

  pool.end(function (err) {
    assert.notEqual(err, null);
  });
});

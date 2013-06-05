var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');

function testMinIdle() {
  var config = common.getTestConfig({
    minIdle: 6,
    idleCheckInterval: 2000,
    idleCheckNumPerRun: 2
  });

  var pool = common.createPool(config);

  pool.on('initialized', function() {
    for (var i = 1; i <= 4; i++) {
      (function(idx) {
        setTimeout(function() {
          var expectedPoolSize = config.idleCheckNumPerRun * (idx -1);
          assert.equal(pool.getFreeSize(), expectedPoolSize);

          if (idx === 4) {
            pool.end();
            testMaxIdle();
          }
        }, (idx * 2000) - 1000);
      })(i);
    }
  });
}

function testMaxIdle() {
  var config = common.getTestConfig({
    initialSize: 10,
    maxIdle: 4,
    idleCheckInterval: 1000,
    idleCheckNumPerRun: 2
  });

  var pool = common.createPool(config);

  pool.on('initialized', function() {
    for (var i = 1; i <= 4; i++) {
      (function(idx) {
        setTimeout(function() {
          var expectedPoolSize = config.initialSize - config.idleCheckNumPerRun * (idx -1);

          assert.equal(pool.getFreeSize(), expectedPoolSize);

          if (idx === 4) {
            pool.end();
          }
        }, (idx * 1000) - 500);
      })(i);
    }
  });
}

testMinIdle();

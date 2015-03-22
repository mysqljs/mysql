var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();

var testTimeout = setTimeout(function() {
  throw new Error('Cluster did not end');
}, 5000);

cluster.end(function (err) {
  clearTimeout(testTimeout);
  assert.ifError(err);
});

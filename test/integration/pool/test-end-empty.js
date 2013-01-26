var common    = require('../../common');
var assert    = require('assert');
var pool      = common.createPool();
var poolEnded = false;

pool.end(function(err) {
  poolEnded = true;
  if (err) throw err;
});

process.on('exit', function() {
  assert(poolEnded);
});

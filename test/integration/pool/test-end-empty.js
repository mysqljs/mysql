var common    = require('../../common');
var assert    = require('assert');
var pool      = common.createPool();
var poolEnded = false;

pool.end(function(err) {
  if (err) throw err;
  poolEnded = true;
});

process.on('exit', function() {
  assert(poolEnded);
});

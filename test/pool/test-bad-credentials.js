var common     = require('../common');
var Pool       = require('../../lib/Pool');
var pool = new Pool({password: 'INVALID PASSWORD'});
var assert     = require('assert');

var err;
pool.alloc(function(_err,conn){
  assert.equal(err,undefined);
  err = _err
});


process.on('exit', function() {
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.ok(/access denied/i.test(err.message));
});


var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool();

// standard test
assert.equal(pool.escape('Super'), "'Super'");
// object stringify test
assert.equal(pool.escape({ a: 123 }), "`a` = 123");
// cannot simply test with default timezone, because i don't kown the test-database timezone.

var poolMod= common.createPool({
  // change the defaults
  stringifyObjects   : true,
  timezone           : "+0500"
});

// standard test
assert.equal(poolMod.escape('Super'), "'Super'");
// object stringify test
assert.equal(poolMod.escape({ a: 123 }), "'[object Object]'");
// timezone date test
var date = new Date( Date.UTC( 1950,5,15 ) );
assert.equal(poolMod.escape( date ), "'1950-06-15 05:00:00.000'");

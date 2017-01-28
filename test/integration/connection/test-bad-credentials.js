var assert = require('assert');
var common = require('../../common');

common.getTestConnection({password: common.bogusPassword}, function (err) {
  if (!err && process.env.NO_GRANT) {
    common.skipTest('no grant tables');
  }

  assert.ok(err, 'got error');
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.ok(/access denied/i.test(err.message), 'message is acccess denied');
});

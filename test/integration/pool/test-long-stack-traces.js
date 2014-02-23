var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({connectionLimit: 1});

var err;
pool.getConnection(function(_err, conn) {
  if (_err) throw _err;
  pool.query('invalid sql', function(_err) {
    err = _err;
    pool.end();
  });
  process.nextTick(function() {
    conn.release();
  });
});

process.on('exit', function() {
  assert.ok(err.stack.indexOf(__filename) > 0);
});

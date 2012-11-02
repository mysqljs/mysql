// This test verifies that changeUser errors are treated as fatal errors.  The
// rationale for that is that a failure to execute a changeUser sequence may
// cause unexpected behavior for queries that were enqueued under the
// assumption of changeUser to succeed.

var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

if (common.isTravis()) {
  return console.log('skipping - travis mysql does not support this test');
}

var err;
connection.changeUser({user: 'does-not-exist'}, function(_err) {
  err = _err;
  connection.end();
});

process.on('exit', function() {
  if (process.env.NO_GRANT == '1' && err === null) return;
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.equal(err.fatal, true);
});

// This test verifies that changeUser errors are treated as fatal errors.  The
// rationale for that is that a failure to execute a changeUser sequence may
// cause unexpected behavior for queries that were enqueued under the
// assumption of changeUser to succeed.

var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var err;
connection.changeUser({database: 'does-not-exist'}, function(_err) {
  err = _err;
  connection.end();
});

process.on('exit', function() {
  if (process.env.NO_GRANT == '1' && err === null) return;
  // Might yield various error codes (ER_BAD_DB_ERROR, ER_ACCESS_DENIED_ERROR),
  //  so we only check that the error is fatal.
  assert.equal(err.fatal, true);
});

var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
client.useDatabase(common.TEST_DB, function(err, result) {
  // The TEST_DB may not exist right now, so ignore errors related to that
  if (err && err.number === mysql.ERROR_BAD_DB_ERROR) err = null;

  if (err) throw err;

  assert.strictEqual(result.affectedRows, 0);
  client.end();
});

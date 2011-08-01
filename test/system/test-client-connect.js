var common = require('../common');
var client = require(common.dir.lib + '/mysql').createClient(TEST_CONFIG);
var gently = new Gently();

client.connect(gently.expect(function connectCb(err, result) {
  if (err) throw err;

  assert.strictEqual(result.affectedRows, 0);
  client.end();
}));

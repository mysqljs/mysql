var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect(gently.expect(function connectCb(err, result) {
  assert.ifError(err);
}));

client.end(gently.expect(function endCb() {
}));

client.connect(gently.expect(function connectCb2(err, result) {
  assert.ifError(err);

  client.end();
}));


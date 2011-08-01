var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.host = 'BADHOST';

client.connect(gently.expect(function connectCb(err, result) {
  assert.ok(err.code.match(/ECONNREFUSED|ENOTFOUND/));
}));

var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.password = 'WRONG PASSWORD';

client.connect(gently.expect(function connectCb(err, result) {
  assert.equal(err.number, mysql.ERROR_ACCESS_DENIED_ERROR);
}));

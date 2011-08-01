var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.ping(gently.expect(function pingCb(err) {
  if (err) throw err;
}));

client.end();

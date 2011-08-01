var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.useDatabase(TEST_DB, gently.expect(function useDbCb(err) {
  if (err) throw err;
}));

client.end();

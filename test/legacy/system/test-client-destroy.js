var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect(function() {
  throw new Error('Destroy did not prevent client from connecting.');
});

client.destroy();

var common = require('../common');
var test = common.fastOrSlow.fastTestCase();
var mysql = require(common.dir.lib + '/mysql');

var client;
test.before(function() {
  client = mysql.createClient();
  console.log(client);
});

test('Client tries to connect automatically', function() {
  client.query('SELECT 1');
});

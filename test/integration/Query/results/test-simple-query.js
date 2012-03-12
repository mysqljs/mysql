var common = require('../../../common');
var assert = require('assert');
var mysql  = require(common.dir.root);

var client = common.createClient();

client._connect();

var rows;
client.newQuery('SELECT 1', function(err, _rows) {
  if (err) throw err;

  rows = _rows;

  client.end();
});

process.on('exit', function() {
  assert.deepEqual(rows, [{1: 1}]);
});

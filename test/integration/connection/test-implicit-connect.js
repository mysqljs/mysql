var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
var connection = common.createConnection();
var assert     = require('assert');

var rows = undefined;
connection.query('SELECT 1', function(err, _result) {
  if (err) throw err;

  result = _result;
});

connection.end();

process.on('exit', function() {
  var rs0 = new ResultSet();
  rs0.push({1: 1});
  assert.deepEqual(result, rs0);
});

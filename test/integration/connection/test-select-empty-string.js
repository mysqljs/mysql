var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
var connection = common.createConnection();
var assert     = require('assert');

var rows;
connection.query('SELECT ""', function(err, _result) {
  if (err) throw err;

  result = _result;
});

connection.end();

process.on('exit', function() {
  var rs0 = new ResultSet();
  rs0.push({'': ''});
  assert.deepEqual(result, rs0);
});

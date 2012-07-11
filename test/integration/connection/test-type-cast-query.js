var common     = require('../../common');
var connection = common.createConnection({typeCast: true});
var assert     = require('assert');

connection.connect();

var options = {
  sql      : "SELECT NOW() as date",
  typeCast : false,
};

var rows = undefined;
var query = connection.query(options, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'string');
});

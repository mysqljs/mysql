var common     = require('../common');
var connection = common.createConnection({typeCast: true});
var assert     = require('assert');

connection.connect();

var rows = undefined;
var query = connection.query("SELECT NOW() as date", function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

query.typeCast = false;

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'string');
});

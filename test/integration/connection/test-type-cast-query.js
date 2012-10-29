var common     = require('../../common');
var connection = common.createConnection({typeCast: true});
var assert     = require('assert');
var util       = require('util');

connection.connect();

var options = {
  sql      : "SELECT NOW() as date, POINT(1.2,-3.4) as point",
  typeCast : false
};

var rows;
var query = connection.query(options, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'object');
  assert.equal(util.isDate(rows[0].date), true);

  assert.strictEqual(typeof rows[0].point, 'object');
  assert.strictEqual(rows[0].point.x, 1.2);
  assert.strictEqual(rows[0].point.y, -3.4);
});

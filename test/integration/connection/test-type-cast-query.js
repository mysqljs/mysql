var common     = require('../../common');
var connection = common.createConnection({typeCast: true});
var assert     = require('assert');

connection.connect();

var options = {
  sql      : "SELECT NOW() as date, POINT(1.2,-3.4) as point",
  typeCast : false,
};

var rows = undefined;
var query = connection.query(options, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'object');
  assert.equal(Buffer.isBuffer(rows[0].date), true);

  var point = rows[0].point
  assert.strictEqual(typeof point, 'object');
  assert.equal(Buffer.isBuffer(point), true);
  assert.equal(point.readUInt32LE(0), 0); // unknown
  var byteOrder = point.readUInt8(4);
  var wkbType = byteOrder? point.readUInt32LE(5) : point.readUInt32BE(5);
  assert.equal(wkbType, 1); // WKBPoint
  var x = byteOrder? point.readDoubleLE(9) : point.readDoubleBE(9);
  var y = byteOrder? point.readDoubleLE(17) : point.readDoubleBE(17);
  assert.equal(x, 1.2);
  assert.equal(y, -3.4);
});

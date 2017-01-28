var assert = require('assert');
var common = require('../../common');

common.getTestConnection({typeCast: true}, function (err, connection) {
  assert.ifError(err);

  var options = {
    sql      : 'SELECT NOW() as date, POINT(1.2,-3.4) as point',
    typeCast : false
  };

  connection.query(options, function(err, rows) {
    assert.ifError(err);

    var point = rows[0].point;
    var byteOrder = point.readUInt8(4);
    var wkbType = byteOrder ? point.readUInt32LE(5) : point.readUInt32BE(5);
    var x = byteOrder ? point.readDoubleLE(9) : point.readDoubleBE(9);
    var y = byteOrder ? point.readDoubleLE(17) : point.readDoubleBE(17);

    assert.strictEqual(typeof rows[0].date, 'object');
    assert.equal(Buffer.isBuffer(rows[0].date), true);
    assert.strictEqual(typeof point, 'object');
    assert.equal(Buffer.isBuffer(point), true);
    assert.equal(point.readUInt32LE(0), 0); // unknown
    assert.equal(wkbType, 1); // WKBPoint
    assert.equal(x, 1.2);
    assert.equal(y, -3.4);
  });

  connection.end(assert.ifError);
});

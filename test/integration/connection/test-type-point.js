var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var result = []

common.useTestDb(connection);

connection.query('CREATE TEMPORARY TABLE geom (id INT, pt POINT) ENGINE=InnoDB DEFAULT CHARSET=utf8');

connection.query('INSERT INTO geom VALUES (1,POINT(1.2,-3.4))');

connection.query('SELECT ASTEXT(pt) as pt FROM geom WHERE id=1', function(err, rows) {
  if (err) throw err;
  result.push(rows[0].pt);
});

connection.query('SELECT pt FROM geom WHERE id=1', function(err, rows) {
  if (err) throw err;
  result.push(rows[0].pt);
});

var binpoint = new Buffer(21);
binpoint.writeUInt8(1, 0);
binpoint.writeUInt32LE(1, 1);
binpoint.writeDoubleLE(-5.6, 5);
binpoint.writeDoubleLE(10.23, 13);
connection.query('INSERT INTO geom VALUES (2,GeomFromWKB(' + connection.escape(binpoint) + '))');

connection.query('SELECT ASTEXT(pt) as pt FROM geom WHERE id=2', function(err, rows) {
  if (err) throw err;
  result.push(rows[0].pt);
});

connection.query('SELECT pt FROM geom WHERE id=2', function(err, rows) {
  if (err) throw err;
  result.push(rows[0].pt);
});

connection.end();

process.on('exit', function() {
  assert.equal(result[0], 'POINT(1.2 -3.4)');
  var binary = result[1];
  assert.equal(Buffer.isBuffer(binary), true);
  assert.equal(binary.readUInt32LE(0), 0); // unknown
  var byteOrder = binary.readUInt8(4);
  var wkbType = byteOrder? binary.readUInt32LE(5) : binary.readUInt32BE(5);
  assert.equal(wkbType, 1); // WKBPoint
  var x = byteOrder? binary.readDoubleLE(9) : binary.readDoubleBE(9);
  var y = byteOrder? binary.readDoubleLE(17) : binary.readDoubleBE(17);
  assert.equal(x, 1.2);
  assert.equal(y, -3.4);

  assert.equal(result[2], 'POINT(-5.6 10.23)');
  var binary = result[3];
  assert.equal(Buffer.isBuffer(binary), true);
  assert.equal(binary.readUInt32LE(0), 0); // unknown
  var byteOrder = binary.readUInt8(4);
  var wkbType = byteOrder? binary.readUInt32LE(5) : binary.readUInt32BE(5);
  assert.equal(wkbType, 1); // WKBPoint
  var x = byteOrder? binary.readDoubleLE(9) : binary.readDoubleBE(9);
  var y = byteOrder? binary.readDoubleLE(17) : binary.readDoubleBE(17);
  assert.equal(x, -5.6);
  assert.equal(y, 10.23);
});

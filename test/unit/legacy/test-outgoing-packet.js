var common = require('./common');
var OutgoingPacket = require(common.dir.lib + '/outgoing_packet'),
    Buffer = require('buffer').Buffer;

function test(test) {
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  var packet = new OutgoingPacket(10, 5);
  assert.equal(packet.buffer.length, 14);
  assert.deepEqual(
    packet.buffer.slice(0, 3),
    new Buffer([10, 0, 0])
  );
  assert.equal(packet.buffer[3], 5);
  assert.equal(packet.index, 4);
});

test(function writeNumber() {
  var packet = new OutgoingPacket(4);
  packet.writeNumber(4, 257);
  assert.deepEqual(
    packet.buffer.slice(4, 8),
    new Buffer([1, 1, 0, 0])
  );
});

test(function writeFiller() {
  var packet = new OutgoingPacket(5);
  packet.writeFiller(5);
  assert.equal(packet.index, 9);
  assert.deepEqual(
    packet.buffer.slice(4, 9),
    new Buffer([0, 0, 0, 0, 0])
  );
});

test(function write() {
  (function testBuffer() {
    var packet = new OutgoingPacket(3),
        BUFFER = new Buffer([1, 2, 3]);

    packet.write(BUFFER);
    assert.equal(packet.index, 7);
    assert.deepEqual(packet.buffer.slice(4, 7), BUFFER);
  })();

  (function testString() {
    var packet = new OutgoingPacket(3),
        STRING = 'abc';

    packet.write(STRING);
    assert.equal(packet.index, 7);
    assert.equal(packet.buffer.slice(4, 7).toString(), STRING);
  })();
});

test(function writeNullTerminated() {
  var packet = new OutgoingPacket(4),
      BUFFER = new Buffer([17, 23, 42]);

  packet.buffer[7] = 100; // set last byte to non-0

  gently.expect(packet, 'write', function(buffer) {
    assert.strictEqual(buffer, BUFFER);
    this.index += buffer.length;
  });

  packet.writeNullTerminated(BUFFER);
  assert.equal(packet.buffer[7], 0);
  assert.equal(packet.index, 8);
});

test(function writeLengthCoded() {
  (function test1ByteNumber() {
    var packet = new OutgoingPacket(1);
    packet.writeLengthCoded(250);
    assert.equal(packet.buffer[4], 250);
    assert.equal(packet.index, 5);
  })();

  (function test2ByteNumber() {
    var packet = new OutgoingPacket(6);
    packet.writeLengthCoded(251);
    assert.equal(packet.buffer[4], 252);
    assert.equal(packet.buffer[5], 251);
    assert.equal(packet.buffer[6], 0);
    assert.equal(packet.index, 7);

    packet.writeLengthCoded(257);
    assert.equal(packet.buffer[7], 252);
    assert.equal(packet.buffer[8], 1);
    assert.equal(packet.buffer[9], 1);
    assert.equal(packet.index, 10);
  })();

  (function test3ByteNumber() {
    var packet = new OutgoingPacket(4);
    packet.writeLengthCoded(Math.pow(256, 0) * 5 + Math.pow(256, 1) * 6 + Math.pow(256, 2) * 7);
    assert.equal(packet.buffer[4], 253);
    assert.equal(packet.buffer[5], 5);
    assert.equal(packet.buffer[6], 6);
    assert.equal(packet.buffer[7], 7);
    assert.equal(packet.index, 8);
  })();

  (function testNull() {
    var packet = new OutgoingPacket(1);
    packet.writeLengthCoded(null);
    assert.equal(packet.buffer[4], 251);
    assert.equal(packet.index, 5);
  })();

  (function testBuffer() {
    var packet = new OutgoingPacket(4),
        BUFFER = new Buffer([17, 23, 42]);

    packet.writeLengthCoded(BUFFER);
    assert.equal(packet.buffer[4], 3);
    assert.deepEqual(packet.buffer.slice(5, 8), BUFFER);
  })();

  (function testString() {
    var packet = new OutgoingPacket(6),
        STRING = 'über';

    packet.writeLengthCoded(STRING);
    assert.equal(packet.buffer[4], 5);
    assert.equal(packet.buffer.slice(5, 10).toString(), STRING);
  })();
});

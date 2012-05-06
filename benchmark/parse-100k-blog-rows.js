var lib          = __dirname + '/../lib';
var Protocol     = require(lib + '/protocol/protocol');
var Packets      = require(lib + '/protocol/packets');
var PacketWriter = require(lib + '/protocol/PacketWriter');

var options = {
  rows       : 100000,
  bufferSize : 64 * 1024,
};

console.error('Config:', options);

function createBuffers() {
  process.stderr.write('Creating row buffers ... ');

  var number = 1;
  var id     = 0;
  var start  = Date.now();

  var buffers = [
    createPacketBuffer(number++, new Packets.ResultSetHeaderPacket({fieldCount: 2})),
    createPacketBuffer(number++, new Packets.FieldPacket({catalog: 'foo', name: 'id'})),
    createPacketBuffer(number++, new Packets.FieldPacket({catalog: 'foo', name: 'text'})),
    createPacketBuffer(number++, new Packets.EofPacket()),
  ];

  for (var i = 0; i < options.rows; i++) {
    buffers.push(createRowDataPacketBuffer(id++, number++));
  }

  buffers.push(createPacketBuffer(number++, new Packets.EofPacket));

  buffers = mergeBuffers(buffers);

  var bytes = buffers.reduce(function(bytes, buffer) {
    return bytes + buffer.length;
  }, 0);

  var mb = (bytes / 1024 / 1024).toFixed(2)

  console.error('%s buffers (%s mb) in %s ms', buffers.length, mb, (Date.now() - start));

  return buffers;
}

function createPacketBuffer(number, packet) {
  var writer = new PacketWriter(number % 256);
  packet.write(writer);
  return writer.toBuffer();
}

function createRowDataPacketBuffer(id, number) {
  var writer = new PacketWriter(number++ % 256);

  writer.writeLengthCodedString(id);
  writer.writeLengthCodedString('Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has sur');

  return writer.toBuffer();
}

function mergeBuffers(buffers) {
  var mergeBuffer  = new Buffer(options.bufferSize);
  var mergeBuffers = [];
  var offset       = 0;

  for (var i = 0; i < buffers.length; i++) {
    var buffer = buffers[i];

    var bytesRemaining = mergeBuffer.length - offset;
    if (buffer.length < bytesRemaining) {
      buffer.copy(mergeBuffer, offset);
      offset += buffer.length;
    } else {
      buffer.copy(mergeBuffer, offset, 0, bytesRemaining);
      mergeBuffers.push(mergeBuffer);

      mergeBuffer = new Buffer(options.bufferSize);
      buffer.copy(mergeBuffer, 0, bytesRemaining);
      offset = buffer.length - bytesRemaining;
    }
  }

  if (offset > 0) {
    mergeBuffers.push(mergeBuffer.slice(0, offset));
  }

  return mergeBuffers;
}

function benchmark(buffers) {
  var protocol = new Protocol();
  protocol._handshakeInitializationPacket = true;
  protocol.query({typeCast: false, sql: 'SELECT ...'});

  var start = +new Date;

  for (var i = 0; i < buffers.length; i++) {
    protocol.write(buffers[i]);
  }

  var duration = Date.now() - start;
  var hz = Math.round(options.rows / (duration / 1000));
  console.log(hz);
}

var buffers = createBuffers();
while (true) {
  benchmark(buffers);
}

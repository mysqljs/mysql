module.exports = CompressedPacketHeader;
function CompressedPacketHeader(options) {
  options = options || {};

  this.length   = options.length || 0;
  this.sequence = options.sequence || 0;
  this.size     = options.size || 0;
}

CompressedPacketHeader.fromBuffer = function fromBuffer(buffer) {
  var length   = 0;
  var offset   = 0;
  var sequence = 0;
  var size     = 0;

  for (var i = 0; i < 3; i++) {
    length |= buffer[offset++] << (i * 8);
  }

  sequence = buffer[offset++];

  for (var i = 0; i < 3; i++) {
    size |= buffer[offset++] << (i * 8);
  }

  return new CompressedPacketHeader({
    length   : length,
    sequence : sequence,
    size     : size
  });
};

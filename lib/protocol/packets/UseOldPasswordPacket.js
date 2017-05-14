module.exports = UseOldPasswordPacket;
function UseOldPasswordPacket(options) {
  options = options || {};

  this.firstByte  = options.firstByte || 0xfe;
  this.methodName = options.methodName;
  this.pluginData = options.pluginData;
}

UseOldPasswordPacket.prototype.parse = function(parser) {
  this.firstByte = parser.parseUnsignedNumber(1);
  if (!parser.reachedPacketEnd()) {
    this.methodName = parser.parseNullTerminatedString();
    this.pluginData = parser.parsePacketTerminatedBuffer();
  }
};

UseOldPasswordPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.firstByte);
  if (this.methodName !== undefined) {
    writer.writeNullTerminatedString(this.methodName);
    if (this.pluginData !== undefined) {
      writer.writeBuffer(this.pluginData);
    }
  }
};

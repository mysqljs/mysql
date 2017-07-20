module.exports = UseAuthSwitchPacket;
function UseAuthSwitchPacket(options) {
  options = options || {};
  this.firstByte =  options.firstByte || 0xfe;
  this.authPluginName = options.authPluginName || '';
  this.authPluginData = options.authPluginData || '';
}

UseAuthSwitchPacket.prototype.parse = function(parser) {
  this.firstByte = parser.parseUnsignedNumber(1);
  this.authPluginName = parser.parseNullTerminatedString();
  this.authPluginData = parser.parsePacketTerminatedBuffer();
};

UseAuthSwitchPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.firstByte);
  writer.writeNullTerminatedString(this.authPluginName);
  writer.writeBuffer(this.authPluginData);
};

module.exports = AuthMoreDataPacket;
function AuthMoreDataPacket(options) {
  options = options || {};

  this.status = 0x01;
  this.data   = options.data;
}

AuthMoreDataPacket.prototype.parse = function parse(parser) {
  this.status = parser.parseUnsignedNumber(1);
  this.data   = parser.parsePacketTerminatedString();
};

AuthMoreDataPacket.prototype.write = function parse(writer) {
  writer.writeUnsignedNumber(this.status);
  writer.writeString(this.data);
};

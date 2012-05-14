module.exports = ClientAuthenticationPacket;
function ClientAuthenticationPacket(options) {
  options = options || {};

  this.clientFlags   = options.clientFlags;
  this.maxPacketSize = options.maxPacketSize;
  this.charsetNumber = options.charsetNumber;
  this.filler        = undefined;
  this.user          = options.user;
  this.scrambleBuff  = options.scrambleBuff;
  this.database      = options.database;
}

ClientAuthenticationPacket.prototype.parse = function(parser) {
  this.clientFlags   = parser.parseUnsignedNumber(4);
  this.maxPacketSize = parser.parseUnsignedNumber(4);
  this.charsetNumber = parser.parseUnsignedNumber(1);
  this.filler        = parser.parseFiller(23);
  this.user          = parser.parseNullTerminatedString();
  this.scrambleBuff  = parser.parseLengthCodedBuffer();
  this.database      = parser.parseNullTerminatedString();
};

ClientAuthenticationPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(4, this.clientFlags);
  writer.writeUnsignedNumber(4, this.maxPacketSize);
  writer.writeUnsignedNumber(1, this.charsetNumber);
  writer.writeFiller(23);
  writer.writeNullTerminatedString(this.user);
  writer.writeLengthCodedBuffer(this.scrambleBuff);
  writer.writeNullTerminatedString(this.database);
};

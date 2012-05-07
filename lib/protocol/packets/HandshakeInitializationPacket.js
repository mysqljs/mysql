module.exports = HandshakeInitializationPacket;
function HandshakeInitializationPacket() {
  this.protocolVersion     = undefined;
  this.serverVersion       = undefined;
  this.threadId            = undefined;
  this.scrambleBuff1       = undefined;
  this.filler1             = undefined;
  this.serverCapabilities1 = undefined;
  this.serverLanguage      = undefined;
  this.serverStatus        = undefined;
  this.serverCapabilities2 = undefined;
  this.scrambleLength      = undefined;
  this.filler2             = undefined;
  this.scrambleBuff2       = undefined;
  this.pluginData          = undefined;
}

HandshakeInitializationPacket.prototype.parse = function(parser) {
  this.protocolVersion     = parser.parseUnsignedNumber(1);
  this.serverVersion       = parser.parseNullTerminatedString();
  this.threadId            = parser.parseUnsignedNumber(4);
  this.scrambleBuff1       = parser.parseBuffer(8);
  this.filler1             = parser.parseFiller(1);
  this.serverCapabilities1 = parser.parseUnsignedNumber(2);
  this.serverLanguage      = parser.parseUnsignedNumber(1);
  this.serverStatus        = parser.parseUnsignedNumber(2);
  this.serverCapabilities2 = parser.parseUnsignedNumber(2);
  this.scrambleLength      = parser.parseUnsignedNumber(1);
  this.filler2             = parser.parseFiller(10);
  this.scrambleBuff2       = parser.parseNullTerminatedBuffer();
  this.pluginData          = parser.parseNullTerminatedString();
};

HandshakeInitializationPacket.prototype.scrambleBuff = function() {
  var buffer = new Buffer(this.scrambleBuff1.length + this.scrambleBuff2.length);

  this.scrambleBuff1.copy(buffer);
  this.scrambleBuff2.copy(buffer, this.scrambleBuff1.length);

  return buffer;
};

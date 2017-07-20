module.exports = ComChangeUserPacket;
function ComChangeUserPacket(options) {
  options = options || {};

  this.command          = 0x11;
  this.user             = options.user;
  this.scrambleBuff     = options.scrambleBuff;
  this.database         = options.database;
  this.charsetNumber    = options.charsetNumber;
  this.clientPluginAuth = options.clientPluginAuth;
  this.authPluginName   = options.authPluginName;
}

ComChangeUserPacket.prototype.parse = function(parser) {
  this.command       = parser.parseUnsignedNumber(1);
  this.user          = parser.parseNullTerminatedString();
  this.scrambleBuff  = parser.parseLengthCodedBuffer();
  this.database      = parser.parseNullTerminatedString();
  if (!parser.reachedPacketEnd()) {
    this.charsetNumber = parser.parseUnsignedNumber(2);
    if (this.clientPluginAuth === true) {
      this.authPluginName = parser.parseNullTerminatedString();
    }
  }
};

ComChangeUserPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeNullTerminatedString(this.user);
  writer.writeLengthCodedBuffer(this.scrambleBuff);
  writer.writeNullTerminatedString(this.database);
  writer.writeUnsignedNumber(2, this.charsetNumber);
  if (this.clientPluginAuth) {
    writer.writeNullTerminatedString(this.authPluginName);
  }
};

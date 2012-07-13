module.exports = EofPacket;
function EofPacket(options) {
  options = options || {};

  this.fieldCount   = 0xfe;
  this.warningCount = options.warningCount;
  this.serverStatus = options.serverStatus;
}

EofPacket.prototype.parse = function(parser) {
  this.fieldCount   = parser.parseUnsignedNumber(1);
  this.warningCount = parser.parseUnsignedNumber(2);
  this.serverStatus = parser.parseUnsignedNumber(2);
};

EofPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.fieldCount);
  writer.writeUnsignedNumber(2, this.warningCount);
  writer.writeUnsignedNumber(2, this.serverStatus);
};

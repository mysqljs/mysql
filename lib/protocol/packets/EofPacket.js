module.exports = EofPacket;
function EofPacket(options) {
  options = options || {};

  this.fieldCount   = undefined;
  this.warningCount = options.warningCount;
  this.serverStatus = options.serverStatus;
  this.protocol41   = options.protocol41;
}

EofPacket.prototype.parse = function(parser) {
  this.fieldCount   = parser.parseUnsignedNumber(1);
  if (this.protocol41) {
    this.warningCount = parser.parseUnsignedNumber(2);
    this.serverStatus = parser.parseUnsignedNumber(2);
  }
};

EofPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, 0xfe);
  if (this.protocol41) {
    writer.writeUnsignedNumber(2, this.warningCount);
    writer.writeUnsignedNumber(2, this.serverStatus);
  }
};

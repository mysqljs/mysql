module.exports = EofPacket;
function EofPacket() {
  this.fieldCount   = undefined;
  this.warningCount = undefined;
  this.statusFlags  = undefined;
}

EofPacket.prototype.parse = function(parser) {
  this.fieldCount   = parser.parseUnsignedNumber(1);
  this.warningCount = parser.parseUnsignedNumber(2);
  this.statusFlags  = parser.parseUnsignedNumber(2);
};

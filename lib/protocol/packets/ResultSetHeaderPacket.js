module.exports = ResultSetHeaderPacket;
function ResultSetHeaderPacket() {
  this.fieldCount = undefined;
  this.extra      = undefined;
}

ResultSetHeaderPacket.prototype.parse = function(parser) {
  this.fieldCount = parser.parseLengthCodedNumber();

  if (parser.reachedPacketEnd) {
    return;
  }

  this.extra = parser.parseLengthCodedNumber();
};

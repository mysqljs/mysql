module.exports = ResultSetHeaderPacket;
function ResultSetHeaderPacket(options) {
  options = options || {};

  this.fieldCount = options.fieldCount;
  this.extra      = options.extra;
}

ResultSetHeaderPacket.prototype.parse = function(parser) {
  this.fieldCount = parser.parseLengthCodedNumber();

  if (parser.reachedPacketEnd()) return;

  this.extra = (this.fieldCount === null)
    ? parser.parsePacketTerminatedString()
    : parser.parseLengthCodedNumber();
};

ResultSetHeaderPacket.prototype.write = function(writer) {
  writer.writeLengthCodedNumber(this.fieldCount);

  if (this.extra !== undefined) {
    writer.writeLengthCodedNumber(this.extra);
  }
};

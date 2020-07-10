module.exports = ResultSetHeaderPacket;
function ResultSetHeaderPacket(options) {
  options = options || {};

  this.fieldCount = options.fieldCount;
}

ResultSetHeaderPacket.prototype._id = 'ResultSetHeaderPacket';

ResultSetHeaderPacket.prototype.parse = function(parser) {
  this.fieldCount = parser.parseLengthCodedNumber();
};

ResultSetHeaderPacket.prototype.write = function(writer) {
  writer.writeLengthCodedNumber(this.fieldCount);
};

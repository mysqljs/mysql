module.exports = ErrorPacket;
function ErrorPacket(options) {
  options = options || {};

  this.fieldCount     = options.fieldCount;
  this.errno          = options.errno;
  this.sqlStateMarker = options.sqlStateMarker;
  this.sqlState       = options.sqlState;
  this.message        = options.message;
}

ErrorPacket.prototype.parse = function(parser) {
  this.fieldCount     = parser.parseUnsignedNumber(1);
  this.errno          = parser.parseUnsignedNumber(2);
  this.sqlStateMarker = parser.parseString(1);
  this.sqlState       = parser.parseString(5);
  this.message        = parser.parsePacketTerminatedString();
};

ErrorPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, 0xff);
  writer.writeUnsignedNumber(2, this.errno);
  writer.writeString(this.sqlStateMarker || '#');
  writer.writeString(this.sqlState || '12345');
  writer.writeString(this.message);
};

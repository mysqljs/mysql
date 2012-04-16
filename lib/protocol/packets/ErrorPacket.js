module.exports = ErrorPacket;
function ErrorPacket() {
  this.fieldCount     = undefined;
  this.errno          = undefined;
  this.sqlStateMarker = undefined;
  this.sqlState       = undefined;
  this.message        = undefined;
}

ErrorPacket.prototype.parse = function(parser) {
  this.fieldCount     = parser.parseUnsignedNumber(1);
  this.errno          = parser.parseUnsignedNumber(2);
  this.sqlStateMarker = parser.parseString(1);
  this.sqlState       = parser.parseString(5);
  this.message        = parser.parsePacketTerminatedString();
};

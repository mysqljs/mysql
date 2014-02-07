// http://dev.mysql.com/doc/internals/en/ssl.html
// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::SSLRequest

var ClientConstants = require('../constants/client');

module.exports = SSLRequestPacket;

function SSLRequestPacket(options) {
  options = options || {};
  this.clientFlags   = options.clientFlags | ClientConstants.CLIENT_SSL;
  this.maxPacketSize = options.maxPacketSize;
  this.charsetNumber = options.charsetNumber;
}

SSLRequestPacket.prototype.parse = function(parser) {
  // TODO: check SSLRequest packet v41 vs pre v41
  this.clientFlags   = parser.parseUnsignedNumber(4);
  this.maxPacketSize = parser.parseUnsignedNumber(4);
  this.charsetNumber = parser.parseUnsignedNumber(1);
};

SSLRequestPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(4, this.clientFlags);
  writer.writeUnsignedNumber(4, this.maxPacketSize);
  writer.writeUnsignedNumber(1, this.charsetNumber);
  writer.writeFiller(23);
};

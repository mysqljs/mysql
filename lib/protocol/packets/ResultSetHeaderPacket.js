// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Result_Set_Header_Packet

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

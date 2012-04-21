module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets) {
  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket        = fieldPackets[i];
    this[fieldPacket.name] = parser.parseLengthCodedString();
  }
};

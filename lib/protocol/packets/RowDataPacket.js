module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets) {
  var self = this;
  fieldPackets.forEach(function(fieldPacket) {
    self[fieldPacket.name] = parser.parseLengthCodedString();
  });
};

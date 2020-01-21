module.exports = LocalInfileRequestPacket;
function LocalInfileRequestPacket(options) {
  options = options || {};

  this.filename = options.filename;
}

LocalInfileRequestPacket.prototype.parse = function parse(parser) {
  if (parser.parseLengthCodedNumber() !== null) {
    var err  = new TypeError('Received invalid field length');
    err.code = 'PARSER_INVALID_FIELD_LENGTH';
    throw err;
  }

  this.filename = parser.parsePacketTerminatedString();
};

LocalInfileRequestPacket.prototype.write = function write(writer) {
  writer.writeLengthCodedNumber(null);
  writer.writeString(this.filename);
};

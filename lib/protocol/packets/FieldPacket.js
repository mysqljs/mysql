module.exports = FieldPacket;
function FieldPacket(options) {
  options = options || {};

  this.catalog    = options.catalog;
  this.db         = options.db;
  this.table      = options.table;
  this.orgTable   = options.orgTable;
  this.name       = options.name;
  this.orgName    = options.orgName;
  this.charsetNr  = options.charsetNr;
  this.length     = options.length;
  this.type       = options.type;
  this.flags      = options.flags;
  this.decimals   = options.decimals;
  this.default    = options.default;
  this.zeroFill   = options.zeroFill;
  this.protocol41 = options.protocol41;
}

FieldPacket.prototype.parse = function(parser) {
  if (this.protocol41) {
    this.catalog     = parser.parseLengthCodedString();
    this.db          = parser.parseLengthCodedString();
    this.table       = parser.parseLengthCodedString();
    this.orgTable    = parser.parseLengthCodedString();
    this.name        = parser.parseLengthCodedString();
    this.orgName     = parser.parseLengthCodedString();

    if (parser.parseLengthCodedNumber() !== 0x0c) {
      var err  = new TypeError('Received invalid field length');
      err.code = 'PARSER_INVALID_FIELD_LENGTH';
      throw err;
    }

    this.charsetNr   = parser.parseUnsignedNumber(2);
    this.length      = parser.parseUnsignedNumber(4);
    this.type        = parser.parseUnsignedNumber(1);
    this.flags       = parser.parseUnsignedNumber(2);
    this.decimals    = parser.parseUnsignedNumber(1);

    var filler       = parser.parseBuffer(2);
    if (filler[0] !== 0x0 || filler[1] !== 0x0) {
      var err  = new TypeError('Received invalid filler');
      err.code = 'PARSER_INVALID_FILLER';
      throw err;
    }

    // parsed flags
    this.zeroFill    = (this.flags & 0x0040 ? true : false);

    if (parser.reachedPacketEnd()) {
      return;
    }

    this.default     = parser.parseLengthCodedString();
  } else {
    this.table       = parser.parseLengthCodedString();
    this.name        = parser.parseLengthCodedString();
    this.length      = parser.parseUnsignedNumber(parser.parseUnsignedNumber(1));
    this.type        = parser.parseUnsignedNumber(parser.parseUnsignedNumber(1));
  }
};

FieldPacket.prototype.write = function(writer) {
  if (this.protocol41) {
    writer.writeLengthCodedString(this.catalog);
    writer.writeLengthCodedString(this.db);
    writer.writeLengthCodedString(this.table);
    writer.writeLengthCodedString(this.orgTable);
    writer.writeLengthCodedString(this.name);
    writer.writeLengthCodedString(this.orgName);

    writer.writeLengthCodedNumber(0x0c);
    writer.writeUnsignedNumber(2, this.charsetNr || 0);
    writer.writeUnsignedNumber(4, this.length || 0);
    writer.writeUnsignedNumber(1, this.type || 0);
    writer.writeUnsignedNumber(2, this.flags || 0);
    writer.writeUnsignedNumber(1, this.decimals || 0);
    writer.writeFiller(2);

    if (this.default !== undefined) {
      writer.writeLengthCodedString(this.default);
    }
  } else {
    writer.writeLengthCodedString(this.table);
    writer.writeLengthCodedString(this.name);
    writer.writeUnsignedNumber(1, 0x01);
    writer.writeUnsignedNumber(1, this.length);
    writer.writeUnsignedNumber(1, 0x01);
    writer.writeUnsignedNumber(1, this.type);
  }
};

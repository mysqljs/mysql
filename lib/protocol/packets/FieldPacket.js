module.exports = FieldPacket;
function FieldPacket(options) {
  options = options || {};

  this.catalog   = options.catalog;
  this.db        = options.db;
  this.table     = options.table;
  this.orgTable  = options.orgTable;
  this.name      = options.name;
  this.orgName   = options.orgName;
  this.filler1   = undefined;
  this.charsetNr = options.charsetNr;
  this.length    = options.length;
  this.type      = options.type;
  this.flags     = options.flags;
  this.decimals  = options.decimals;
  this.filler2   = undefined;
  this.default   = options.default;
  this.zeroFill  = options.zeroFill;
}

FieldPacket.prototype.parse = function(parser) {
  this.catalog     = parser.parseLengthCodedString();
  this.db          = parser.parseLengthCodedString();
  this.table       = parser.parseLengthCodedString();
  this.orgTable    = parser.parseLengthCodedString();
  this.name        = parser.parseLengthCodedString();
  this.orgName     = parser.parseLengthCodedString();
  this.filler1     = parser.parseFiller(1);
  this.charsetNr   = parser.parseUnsignedNumber(2);
  this.fieldLength = parser.parseUnsignedNumber(4);
  this.type        = parser.parseUnsignedNumber(1);
  this.flags       = parser.parseUnsignedNumber(2);
  this.decimals    = parser.parseUnsignedNumber(1);
  this.filler2     = parser.parseFiller(2);

  // parsed flags
  this.zeroFill    = (this.flags & 0x0040 ? true : false);

  if (parser.reachedPacketEnd()) {
    return;
  }

  this.default = parser.parseLengthCodedNumber();
};

FieldPacket.prototype.write = function(writer) {
  writer.writeLengthCodedString(this.catalog);
  writer.writeLengthCodedString(this.db);
  writer.writeLengthCodedString(this.table);
  writer.writeLengthCodedString(this.orgTable);
  writer.writeLengthCodedString(this.name);
  writer.writeLengthCodedString(this.orgName);
  writer.writeFiller(1);
  writer.writeUnsignedNumber(2, this.charsetNr || 0);
  writer.writeUnsignedNumber(4, this.fieldLength || 0);
  writer.writeUnsignedNumber(1, this.type) || 0;
  writer.writeUnsignedNumber(2, this.flags || 0);
  writer.writeUnsignedNumber(1, this.decimals || 0);
  writer.writeFiller(2);

  if (this.default !== undefined) {
    writer.writeLengthCodedString(this.default);
  }
};

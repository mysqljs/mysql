var Types = require('../constants/types');

module.exports = Field;
function Field(options) {
  options = options || {};

  this.parser = options.parser;
  this.db     = options.packet.db;
  this.table  = options.packet.table;
  this.name   = options.packet.name;
  this.type   = typeToString(options.packet.type);
  this.length = options.packet.length;
}

Field.prototype.string = function () {
  return this.parser.parseLengthCodedString();
};

Field.prototype.buffer = function () {
  return this.parser.parseLengthCodedBuffer();
};

Field.prototype.geometry = function () {
  return this.parser.parseGeometryValue();
};

function typeToString(t) {
  for (var k in Types) {
    if (Types[k] == t) return k;
  }
}

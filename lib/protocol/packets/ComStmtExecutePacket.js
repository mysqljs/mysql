var Types = require('../constants/types');

module.exports = ComStmtExecutePacket;
function ComStmtExecutePacket(statementId, args) {
  this.command     = 0x17;
  this.statementId = statementId;
  // the docs mention a few cursor types we could set here. I'm not sure how
  // those work so I'm using 0x00 = CURSOR_TYPE_NO_CURSOR for now.
  // see: http://dev.mysql.com/doc/internals/en/prepared-statements.html#com-stmt-execute
  this.flags = 0x00;
  // always 1 according to docs
  this.iterationCount = 1;
  this.newParamsBound = 1;
  this.args           = args;
}

ComStmtExecutePacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeUnsignedNumber(4, this.statementId);
  writer.writeUnsignedNumber(1, this.flags);
  writer.writeUnsignedNumber(1, this.iterationCount);

  var nullBitmap  = new Buffer(Math.floor((this.args.length+7)/8));
  var paramTypes  = new Buffer(this.args.length*2);

  nullBitmap.fill(0x00);
  paramTypes.fill(0x00);

  for (var i = 0; i < this.args.length; i++) {
    var val = this.args[i];
    if (val === null) {
      nullBitmap[Math.floor(i / 8)] |= 1<<(i % 8);
    }

    var type = (typeof val);
    if (type === 'number') {
      paramTypes[i*2] = Types.LONGLONG;
    } else {
      throw new Error('unsupported type: '+type);
    }
  }

  writer.writeBuffer(nullBitmap);
  writer.writeUnsignedNumber(1, this.newParamsBound);
  writer.writeBuffer(paramTypes);

  // it's unfortunate that this loop needs to be done twice, but doing it
  // differently would not work well with the PacketWriter abstraction for now
  // : /. probably not a real performance issue so.
  for (var i = 0; i < this.args.length; i++) {
    var val = this.args[i];
    var type = (typeof val);
    if (type === 'number') {
      writer.writeUnsignedNumber(8, val);
    } else {
      throw new Error('unsupported type: '+type);
    }
  }
};

var Sequence     = require('./Sequence');
var Util         = require('util');
var Packets      = require('../packets');

module.exports = PreparedQuery;
Util.inherits(PreparedQuery, Sequence);
function PreparedQuery(options, callback) {
  Sequence.call(this, callback);

  this._statement = options.statement;
  this._args      = options.args;
}

PreparedQuery.prototype.start = function() {
  // @TODO Check if statement had an error
  var id = this._statement._okPacket.statementId;
  this.emit('packet', new Packets.ComStmtExecutePacket(id, this._args));
};


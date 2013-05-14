var Query   = require('./Query');
var Util    = require('util');
var Packets = require('../packets');

module.exports = PreparedQuery;
Util.inherits(PreparedQuery, Query);
function PreparedQuery(options, callback) {
  var queryOptions = {};
  Query.call(this, queryOptions, callback);

  this._statement = options.statement;
  this._args      = options.args;
}

PreparedQuery.prototype.start = function() {
  // @TODO Check if statement had an error
  var id = this._statement._okPacket.statementId;
  this.emit('packet', new Packets.ComStmtExecutePacket(id, this._args));
};

PreparedQuery.prototype.determinePacket = function(firstByte, parser) {
  var packet = Query.prototype.determinePacket.call(this, firstByte, parser);
  //console.log(firstByte, packet);
  return packet;
}

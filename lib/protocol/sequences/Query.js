module.exports = Query;
function Query(options, callback) {
  this._sql      = options.sql;
  this._callback = callback;
}

Query.prototype.handlePacket = function(packet) {
  console.log('fuck', packet);
};

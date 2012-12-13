var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');
var Types            = require('./lib/protocol/constants/types');
var SqlString        = require('./lib/protocol/SqlString');
var Query            = require('./lib/protocol/sequences/Query');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.Types    = Types;
exports.Query    = Query;
exports.escape   = SqlString.escape;
exports.escapeId = SqlString.escapeId;

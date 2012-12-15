var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');
var Types            = require('./lib/protocol/constants/types');
var SqlString        = require('./lib/protocol/SqlString');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.createQuery = Connection.createQuery;

exports.Types    = Types;
exports.escape   = SqlString.escape;
exports.escapeId = SqlString.escapeId;

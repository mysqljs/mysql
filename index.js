var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');
var Types            = require('./lib/protocol/constants/types');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.escape = require('./lib/protocol/SqlString').escape;
exports.Types = Types;

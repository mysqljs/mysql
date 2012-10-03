var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.Types = require('./lib/protocol/constants/types.js');

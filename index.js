var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');
var Server           = require('./lib/Server');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.createServer = function(connectionHandler) {
  return new Server({onConnection: connectionHandler});
};

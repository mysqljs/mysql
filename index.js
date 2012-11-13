var Connection       = require('./lib/Connection');
var ConnectionConfig = require('./lib/ConnectionConfig');
var Types            = require('./lib/protocol/constants/types');

exports.createConnection = function(config) {
  return new Connection({config: new ConnectionConfig(config)});
};

exports.escape = require('./lib/protocol/SqlString').escape;
exports.Types = Types;

var path = require('path');
var Plugins = require('fs').readdirSync('./plugins/');

for (var i in Plugins) {
	if (Plugins[i].substr(-3) != '.js') continue;

	exports[Plugins[i].substr(0, Plugins[i].length - 3)] = require('./plugins/' + Plugins[i]);
}

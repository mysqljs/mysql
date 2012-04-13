var MysqlClient     = require('./lib/MysqlClient');
var MysqlConnection = require('./lib/MysqlConnection');

exports.createClient = function(config) {
  return new MysqlClient({config: config});
};

exports.createConnection = function(config) {
  return new MysqlConnection({config: config});
};

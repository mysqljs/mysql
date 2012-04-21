var Connection = require('./lib/Connection');

exports.createConnection = function(config) {
  return new Connection({config: config});
};

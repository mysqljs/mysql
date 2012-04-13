var Net         = require('net');
var MysqlConfig = require('./MysqlConfig');
var Parser      = require('./protocol/Parser');

module.exports = MysqlConnection;
function MysqlConnection(options) {
  this.config = new MysqlConfig(options.config);
  this.parser = new Parser();
  this.socket = options.socket;
}

MysqlConnection.prototype.connect = function(cb) {
  if (!this.socket) {
    this.socket = Net.createConnection(this.config.port, this.config.host);
  }

  var self = this;

  this.socket.on('data', function(buffer) {
    self.parser.write(buffer);
  });
};

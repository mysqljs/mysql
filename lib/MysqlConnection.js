var Net         = require('net');
var MysqlConfig = require('./MysqlConfig');
var Protocol    = require('./protocol/Protocol');

module.exports = MysqlConnection;
function MysqlConnection(options) {
  this.config   = new MysqlConfig(options.config);
  this.socket   = options.socket;
  this.protocol = new Protocol();
}

MysqlConnection.prototype.connect = function(cb) {
  if (!this.socket) {
    this.socket = Net.createConnection(this.config.port, this.config.host);
  }

  // @TODO, determine if we can use streams here without loosing performance
  var self = this;
  this.socket.on('data', function(buffer) {
    self.protocol.write(buffer);
  });

  this.protocol.onData = function(buffer) {
    self.socket.write(buffer);
  };

  self.protocol.handshake(this.config, cb);
};

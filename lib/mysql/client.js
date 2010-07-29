if (global.GENTLY) require = GENTLY.hijack(require);

var sys = require('sys')
  , Stream = require('net').Stream
  , Parser = require('./parser')
  , EventEmitter = require('events').EventEmitter;

function Client(config) {
  if (!(this instanceof Client)) {
    return new Client(config);
  }

  EventEmitter.call(this);

  this.host = 'localhost';
  this.port = 3306;
  this.user = null;
  this.password = null;
  this.database = null;

  this.connection = null;
  this.parser = null;

  for (var key in config) {
    this[key] = config[key];
  }
}
sys.inherits(Client, EventEmitter);
module.exports = Client;

Client.prototype.connect = function() {
  var connection = this.connection = new Stream()
    , parser = this.parser = new Parser();

  connection.connect(this.port, this.host);
  connection
    .on('data', function(b) {
      parser.write(b);
    });

  // parser
  //   .on('packet', function(packet) {
  //     console.log('%j', packet);
  //   });
};
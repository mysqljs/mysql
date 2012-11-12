var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Statistics;
Util.inherits(Statistics, Sequence);
function Statistics(callback) {
  Sequence.call(this, callback);
}

Statistics.prototype.start = function() {
  this.emit('packet', new Packets.ComStatisticsPacket);
};

Statistics.prototype['StatisticsPacket'] = function (packet) {
  this.end(null, packet);
};

Statistics.prototype.determinePacket = function(firstByte, parser) {
  if (firstByte === 0x55) {
    return Packets.StatisticsPacket;
  }
};

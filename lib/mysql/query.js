var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

function Query() {
  EventEmitter.call(this);
}
sys.inherits(Query, EventEmitter);
module.exports = Query;


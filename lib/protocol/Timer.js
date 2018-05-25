var Timers = require('timers');

module.exports = Timer;
function Timer(object) {
  this._object  = object;
  this._timeout = null;
}

Timer.prototype.active = function active() {
  if (this._timeout) {
    if (this._timeout.refresh) {
      this._timeout.refresh();
    } else {
      Timers.active(this._timeout);
    }
  }
};

Timer.prototype.start = function start(msecs) {
  this.stop();
  this._timeout = Timers.setTimeout(this._onTimeout.bind(this), msecs);
};

Timer.prototype.stop = function stop() {
  if (this._timeout) {
    Timers.clearTimeout(this._timeout);
    this._timeout = null;
  }
};

Timer.prototype._onTimeout = function _onTimeout() {
  return this._object._onTimeout();
};

var Timers = require('timers');

function hasRefresh() {
  var testTimer = setTimeout(function() {}, 100);
  var result = typeof testTimer.refresh === 'function';

  clearTimeout(testTimer);

  return result;
}

if (hasRefresh()) {
  module.exports.setTimeout = setTimeout;
  module.exports.clearTimeout = clearTimeout;
} else {
  module.exports.setTimeout = function setTimeout(callback, after) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function.');
    }

    var args = Array.prototype.slice.call(arguments, 2);
    var timer = {
      _idleNext    : null,
      _idlePrev    : null,
      _idleStart   : null,
      _idleTimeout : -1,
      _repeat      : null,
      _onTimeout   : function _onTimeout() {
        callback.apply(this, args);
      },
      refresh: function refresh() {
        Timers.active(this);
      }
    };

    Timers.enroll(timer, after);
    Timers.active(timer);
    return timer;
  };
  module.exports.clearTimeout = function clearTimeout(timer) {
    if (timer) {
      Timers.unenroll(timer);
    }
  };
}

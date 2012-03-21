var Async = exports;

// A simple version of the async.waterfall (on npm) that does not use
// nextTick (which is not acceptable for my needs in node-mysql).
Async.waterfall = function(tasks, cb, args) {
  var task = tasks.shift();
  if (!task) {
    return cb.apply(null, args);
  }

  args = (args)
    ? args.slice(1)
    : [];

  args.push(function(err) {
    if (err) {
      cb(err);
      return;
    }

    var args = Array.prototype.slice.call(arguments);
    Async.waterfall(tasks, cb, args);
  });

  task.apply(null, args);
};

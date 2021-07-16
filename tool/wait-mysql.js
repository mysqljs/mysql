var Net = require('net');

var CHECK_INTERVAL_MS = 200;
var CHECK_TIMEOUT     = 120000;
var TCP_TIMEOUT       = 1000;

process.nextTick(run);

function check(host, port, callback) {
  var socket = Net.createConnection(port, host);
  var timer  = setTimeout(function () {
    socket.destroy();
    callback(false);
  }, TCP_TIMEOUT);

  socket.once('data', function () {
    clearTimeout(timer);
    socket.destroy();
    callback(true);
  });

  socket.on('error', function () {
    clearTimeout(timer);
    callback(false);
  });
}

function run() {
  var host = process.argv[3] || 'localhost';
  var port = Number(process.argv[2]);

  function next() {
    check(host, port, function (connected) {
      if (connected) {
        console.log('connected to %s:%d', host, port);
        process.exit(0);
      } else {
        setTimeout(next, CHECK_INTERVAL_MS);
      }
    });
  }

  setTimeout(function () {
    console.error('timeout waiting for %s:%d', host, port);
    process.exit(1);
  }, CHECK_TIMEOUT);

  next();
}

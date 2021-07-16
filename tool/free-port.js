var Net = require('net');

var PORT_END    = 60000;
var PORT_START  = 1000;
var TCP_TIMEOUT = 1000;

process.nextTick(run);

function check(port, callback) {
  var socket = Net.createConnection(port, 'localhost');
  var timer  = setTimeout(function () {
    socket.destroy();
    callback(undefined);
  }, TCP_TIMEOUT);

  socket.on('connect', function () {
    clearTimeout(timer);
    socket.destroy();
    callback(true);
  });

  socket.on('error', function (err) {
    clearTimeout(timer);
    if (err.syscall === 'connect' && err.code === 'ECONNREFUSED') {
      callback(false);
    } else {
      callback(undefined);
    }
  });
}

function run() {
  function next() {
    var port = PORT_START + Math.floor(Math.random() * (PORT_END - PORT_START + 1));

    check(port, function (used) {
      if (used === false) {
        console.log('%d', port);
        process.exit(0);
      } else {
        setTimeout(next, 0);
      }
    });
  }

  next();
}

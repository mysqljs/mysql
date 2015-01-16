var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort
});
var server = common.createFakeServer();


server.listen(common.fakeServerPort, function(err){
  
  pool.getConnection(function(err, conn) {

    var socket_closed = false;

	// socket should be closed after pool.end()
    conn._socket.on('close', function() {
      server.destroy();
      socket_closed = true;
    });

	// an open socket will prevent the script from ending,
	// hence the timeout
	setTimeout( function() {
		assert(socket_closed, true);
		server.destroy();
	}, 5000);

	// attempt to make an invalid query
	var seq = conn.query('');

	// NOT listening to 'error' from seq
		
	seq.on('end', function() {
      conn.release();
      pool.end();  
	});

  });
});

var common = require('../test/common');

process.nextTick(run);

function run() {
  var conn = common.createConnection();

  conn.connect(function () {
    conn.destroy();

    try {
      console.log(conn._protocol._handshakeInitializationPacket.serverVersion);
      process.exit(0);
    } catch (e) {
      console.error('unable to get mysql version');
      process.exit(1);
    }
  });
}

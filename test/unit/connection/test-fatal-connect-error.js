var after      = require('after');
var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var count  = 0;
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(3, function () {
    server.destroy();
  });

  connection.connect(function (err) {
    assert.ok(err, 'got error');
    assert.ok(err.fatal);
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    done();
  });

  connection.query('SELECT 1', function (err) {
    assert.ok(err, 'got error');
    assert.ok(err.fatal);
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    done();
  });

  connection.ping(function (err) {
    assert.ok(err, 'got error');
    assert.ok(err.fatal);
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    done();
  });
});

server.on('connection', function (conn) {
  if (count === 0) {
    conn.deny();
    return;
  }

  count++;
  conn.handshake();
});

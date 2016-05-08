var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(2, function () {
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    var count  = 0;
    var paused = false;
    var query  = connection.query('SELECT * FROM stream LIMIT 5');

    query.on('fields', function (fields) {
      assert.ok(fields, 'got fields');
      done();
    });

    query.on('result', function (row) {
      count++;

      assert.equal(paused, false);
      assert.equal(row.id, count);

      paused = true;
      connection.pause();

      setTimeout(function () {
        paused = false;
        connection.resume();
      }, 50);
    });

    query.on('end', function () {
      connection.release();
      done();
    });
  });
});

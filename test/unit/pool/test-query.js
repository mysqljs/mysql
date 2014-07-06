var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['1'], 1);

    // Should work without error
    pool.query('SELECT SQL_ERROR');

    pool.end(function(err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

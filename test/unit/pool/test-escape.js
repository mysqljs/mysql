var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});
var pool2  = common.createPool({port: common.fakeServerPort, stringifyObjects: true});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  assert.equal(pool.escape('Super'), "'Super'");
  assert.equal(pool.escape({ a: 123 }), '`a` = 123');

  assert.equal(pool2.escape('Super'), "'Super'");
  assert.equal(pool2.escape({ a: 123 }), "'[object Object]'");

  pool.end(function (err) {
    assert.ifError(err);
    pool2.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

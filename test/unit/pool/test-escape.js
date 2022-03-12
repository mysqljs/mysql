var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool  = common.createPool({port: server.port()});
  var pool2 = common.createPool({port: server.port(), stringifyObjects: true});

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

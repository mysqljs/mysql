var common = require('./common');
var Parser = require(common.dir.lib + '/Parser');
var constants = require(common.dir.lib + '/constants');
var Client = require(common.dir.lib + '/Client');

function test(test) {
  client = new Client();
  gently = new Gently();
  test();
  gently.verify(test.name);
};

test(function write() {
  var PACKET = {buffer: []},
      CONNECTION = client._socket = {};

  gently.expect(CONNECTION, 'write', function(buffer) {
    assert.strictEqual(buffer, PACKET.buffer);
  });

  client.write(PACKET);
});

test(function format() {
  var sql = client.format('? + ? = ?', [1, 2, 'great']);
  assert.equal(sql, '1 + 2 = \'great\'');

  assert.throws(function() {
    var sql = client.format('? + ? = ?', [1, 2]);
  });

  assert.throws(function() {
    var sql = client.format('? + ? = ?', [1, 2, 3, 4]);
  });
});

test(function _packetToUserObject() {
  (function testOkPacket() {
    var PACKET = {
      type: Parser.OK_PACKET,
      length: 65,
      received: 65,
      number: 92,
      foo: 'bar'
    };

    var ok = Client._packetToUserObject(PACKET);

    assert.notStrictEqual(PACKET, ok);
    assert.ok(!(ok instanceof Error));
    assert.equal(ok.foo, PACKET.foo);
    assert.equal(ok.type, undefined);
    assert.equal(ok.length, undefined);
    assert.equal(ok.received, undefined);
  })();

  (function testErrorPacket() {
    var PACKET = {
      type: Parser.ERROR_PACKET,
      foo: 'bar',
      errorMessage: 'oh no',
      errorNumber: 1007
    };

    var err = Client._packetToUserObject(PACKET);

    assert.ok(err instanceof Error);
    assert.equal(err.message, 'oh no');
    assert.equal(err.errorMessage, undefined);
    assert.equal(err.number, 1007);
    assert.equal(err.errorNumber, undefined);
  })();
});

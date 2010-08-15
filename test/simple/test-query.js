require('../common');
var Query = require('mysql/query'),
    EventEmitter = require('events').EventEmitter,
    Parser = require('mysql/parser'),
    query,
    gently;

function test(test) {
  query = new Query();
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.ok(query instanceof EventEmitter);
});

test(function _handlePacket() {
  (function testOkPacket() {
    var PACKET = {type: Parser.OK_PACKET};

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'end');
      assert.strictEqual(packet, PACKET);
    });

    query._handlePacket(PACKET);
  })();

  (function testErrorPacket() {
    var PACKET = {type: Parser.ERROR_PACKET};

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'error');
      assert.strictEqual(packet, PACKET);
    });

    query._handlePacket(PACKET);
  })();
});

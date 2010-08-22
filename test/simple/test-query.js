require('../common');
var ClientStub = GENTLY.stub('./client'),
    Query = require('mysql/query'),
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
    var PACKET = {type: Parser.OK_PACKET}, USER_OBJECT = {};

    gently.expect(ClientStub, '_packetToUserObject', function (packet) {
      assert.strictEqual(packet, PACKET);
      return USER_OBJECT;
    });

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'end');
      assert.strictEqual(packet, USER_OBJECT);
    });

    query._handlePacket(PACKET);
  })();

  (function testErrorPacket() {
    var PACKET = {type: Parser.ERROR_PACKET}, USER_OBJECT = {};

    gently.expect(ClientStub, '_packetToUserObject', function (packet) {
      assert.strictEqual(packet, PACKET);
      return USER_OBJECT;
    });

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'error');
      assert.strictEqual(packet, USER_OBJECT);
    });

    query._handlePacket(PACKET);
  })();

  (function testFieldPacket() {
    var PACKET = {type: Parser.FIELD_PACKET, name: 'my_field'};

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'field');
      assert.strictEqual(packet, PACKET);
    });

    query._handlePacket(PACKET);

    assert.deepEqual(query._fields, [PACKET.name]);
  })();

  (function testEofPacket() {
    var PACKET = {type: Parser.EOF_PACKET};

    query._handlePacket(PACKET);
    assert.equal(query._eofs, 1);

    gently.expect(query, 'emit', function (event) {
      assert.equal(event, 'end');
    });

    query._handlePacket(PACKET);
    assert.equal(query._eofs, 2);
  })();

  (function testRowPacket() {
    query._fields = ['a', 'b'];

    var PACKET = new EventEmitter();
    PACKET.type = Parser.ROW_DATA_PACKET;

    gently.expect(PACKET, 'on', function (event, fn) {
      assert.equal(event, 'data');

      fn(new Buffer('hello '), 5);
      fn(new Buffer('world'), 0);

      gently.expect(query, 'emit', function (event, row) {
        assert.equal(event, 'row');
        assert.equal(row.a, 'hello world');
        assert.equal(row.b, 'sunny');
      });

      fn(new Buffer('sunny'), 0);
    });

    query._handlePacket(PACKET);
  })();
});

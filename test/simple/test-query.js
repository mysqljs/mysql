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
  assert.strictEqual(query.typeCast, true);
  assert.strictEqual(query.sql, null);
  assert.equal(new Query({foo: 'bar'}).foo, 'bar');
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
      assert.strictEqual(packet.sql, query.sql);
      return USER_OBJECT;
    });

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'error');
      assert.strictEqual(packet, USER_OBJECT);
    });

    query.sql = 'SELECT bla FROM foo';
    query._handlePacket(PACKET);
  })();

  (function testFieldPacket() {
    var PACKET = {type: Parser.FIELD_PACKET, name: 'my_field'};

    gently.expect(query, 'emit', function (event, packet) {
      assert.equal(event, 'field');
      assert.strictEqual(packet, PACKET);
    });

    query._handlePacket(PACKET);

    assert.strictEqual(query._fields[0], PACKET);
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
    query._fields = [{name: 'a', fieldType: -1}, {name: 'b', fieldType: -1}];

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

  function typeCast(type, strValue) {
    query._fields = [{name: 'my_field', fieldType: type}];

    var PACKET = new EventEmitter(), r;
    PACKET.type = Parser.ROW_DATA_PACKET;

    gently.expect(PACKET, 'on', function (event, fn) {
      assert.equal(event, 'data');

      gently.expect(query, 'emit', function (event, row) {
        assert.equal(event, 'row');
        r = row.my_field;
      });

      var val = (strValue === null)
        ? null
        : new Buffer(strValue);

      fn(val, 0);
    });

    query._handlePacket(PACKET);
    return r;
  }

  assert.deepEqual(typeCast(Query.FIELD_TYPE_TIMESTAMP, '2010-10-05 06:23:42'), new Date('2010-10-05 06:23:42Z'));

  assert.deepEqual(typeCast(Query.FIELD_TYPE_TIMESTAMP, '2010-10-05'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_DATE, '2010-10-05'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_DATETIME, '2010-10-05'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_NEWDATE, '2010-10-05'), new Date('2010-10-05Z'));

  assert.strictEqual(typeCast(Query.FIELD_TYPE_TINY, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_SHORT, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_LONG, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_LONGLONG, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_INT24, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_YEAR, '08'), 8);

  assert.strictEqual(typeCast(Query.FIELD_TYPE_DECIMAL, '2.8'), 2.8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_FLOAT, '2.8'), 2.8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_DOUBLE, '2.8'), 2.8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_NEWDECIMAL, '2.8'), 2.8);

  assert.strictEqual(typeCast(Query.FIELD_TYPE_DATE, null), null);
});

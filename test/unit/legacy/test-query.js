var common = require('./common');
var Query = require(common.dir.lib + '/query');
var EventEmitter = require('events').EventEmitter;
var Parser = require(common.dir.lib + '/parser');
var query;
var gently;

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

  assert.deepEqual(typeCast(Query.FIELD_TYPE_TIMESTAMP, '2010-10-05 06:23:42 UTC'), new Date('2010-10-05 06:23:42Z'));

  assert.deepEqual(typeCast(Query.FIELD_TYPE_TIMESTAMP, '2010-10-05 UTC'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_DATE, '2010-10-05 UTC'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_DATETIME, '2010-10-05 UTC'), new Date('2010-10-05Z'));
  assert.deepEqual(typeCast(Query.FIELD_TYPE_NEWDATE, '2010-10-05 UTC'), new Date('2010-10-05Z'));

  assert.strictEqual(typeCast(Query.FIELD_TYPE_TINY, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_SHORT, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_LONG, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_LONGLONG, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_INT24, '08'), 8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_YEAR, '08'), 8);

  assert.strictEqual(typeCast(Query.FIELD_TYPE_DECIMAL, '2.8'), '2.8');
  assert.strictEqual(typeCast(Query.FIELD_TYPE_FLOAT, '2.8'), 2.8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_DOUBLE, '2.8'), 2.8);
  assert.strictEqual(typeCast(Query.FIELD_TYPE_NEWDECIMAL, '2.8'), '2.8');

  assert.strictEqual(typeCast(Query.FIELD_TYPE_DATE, null), null);
});

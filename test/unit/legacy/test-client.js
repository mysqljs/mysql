var common = require('./common');
var Parser = require(common.dir.lib + '/parser');
var constants = require(common.dir.lib + '/constants');
var Client = require(common.dir.lib + '/client');

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

test(function escape() {
  assert.equal(client.escape(undefined), 'NULL');
  assert.equal(client.escape(null), 'NULL');
  assert.equal(client.escape(false), 'false');
  assert.equal(client.escape(true), 'true');
  assert.equal(client.escape(5), '5');
  assert.equal(client.escape({foo:'bar'}), "'[object Object]'");
  assert.equal(client.escape([1,2,3]), "'1','2','3'");
  assert.equal(client.escape(new Date(Date.UTC(2011,6,6,6,6,6,6))), "'2011-07-06T06:06:06.006Z'");

  assert.equal(client.escape('Super'), "'Super'");
  assert.equal(client.escape('Sup\0er'), "'Sup\\0er'");
  assert.equal(client.escape('Sup\ber'), "'Sup\\ber'");
  assert.equal(client.escape('Sup\ner'), "'Sup\\ner'");
  assert.equal(client.escape('Sup\rer'), "'Sup\\rer'");
  assert.equal(client.escape('Sup\ter'), "'Sup\\ter'");
  assert.equal(client.escape('Sup\\er'), "'Sup\\\\er'");
  assert.equal(client.escape('Sup\u001aer'), "'Sup\\Zer'");
  assert.equal(client.escape('Sup\'er'), "'Sup\\'er'");
  assert.equal(client.escape('Sup"er'), "'Sup\\\"er'");
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

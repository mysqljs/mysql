require('../common');
var StreamStub = GENTLY.stub('net', 'Stream')
  , ParserStub = GENTLY.stub('./parser')
  , OutgoingPacketStub = GENTLY.stub('./outgoing_packet')
  , Parser = require('mysql/parser')
  , Client = require('mysql/client');

for (var k in Parser) {
  ParserStub[k] = Parser[k];
}

function test(test) {
  client = new Client();
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  (function testDefaultProperties() {
      var client = new Client();

      assert.strictEqual(client.host, 'localhost');
      assert.strictEqual(client.port, 3306);
      assert.strictEqual(client.user, null);
      assert.strictEqual(client.password, null);
      assert.strictEqual(client.database, null);

      assert.strictEqual(client.flags, Client.defaultFlags);
      assert.strictEqual(client.maxPacketSize, 0x01000000);
      assert.strictEqual(client.charsetNumber, 8);

      assert.strictEqual(client._connection, null);
      assert.strictEqual(client._parser, null);
      assert.strictEqual(client._callback, null);
  })();

  (function testMixin() {
    var client = new Client({foo: 'bar'});
    assert.strictEqual(client.foo, 'bar');
  })();

  (function testWithoutNew() {
    var client = Client({foo: 'bar'});
    assert.strictEqual(client.foo, 'bar');
  })();
});

test(function connect() {
  var CONNECTION
    , PARSER
    , onConnection = {}
    , onParser = {};

  gently.expect(StreamStub, 'new', function() {
    CONNECTION = this;

    gently.expect(CONNECTION, 'connect', function(port, host) {
      assert.equal(port, client.port);
      assert.equal(host, client.host);
    });

    var events = ['error', 'data'];
    gently.expect(CONNECTION, 'on', events.length, function(event, fn) {
      assert.equal(event, events.shift());
      onConnection[event] = fn;
      return this;
    });
  });

  gently.expect(ParserStub, 'new', function() {
    PARSER = this;

    var events = ['packet'];
    gently.expect(PARSER, 'on', events.length, function(event, fn) {
      assert.equal(event, events.shift());
      onParser[event] = fn;
      return this;
    });
  });

  var CB = function() {};
  client.connect(CB);

  assert.strictEqual(client._connection, CONNECTION);
  assert.strictEqual(client._parser, PARSER);
  assert.strictEqual(client._callback, CB);

  (function testConnectionError() {
    var ERR = new Error('ouch');
    gently.expect(client, 'emit', function(event, err) {
      assert.equal(event, 'error');
      assert.equal(err, ERR);
    });

    onConnection.error(ERR);
  })();

  (function testOnConnectionData() {
    var BUFFER = {};
    gently.expect(PARSER, 'write', function(buffer) {
      assert.strictEqual(buffer, BUFFER );
    });

    onConnection.data(BUFFER );
  })();

  (function testOnParserGreetingPacket() {
    var PACKET = {type: Parser.GREETING_PACKET};

    gently.expect(client, '_sendAuthenticationPacket', function(packet) {
      assert.strictEqual(packet, PACKET);
    });

    onParser.packet(PACKET);
  })();

  (function testOnParserErrorPacket() {
    var PACKET = {type: Parser.ERROR_PACKET};

    gently.expect(client, '_error', function(packet) {
      assert.strictEqual(packet, PACKET);
    });

    onParser.packet(PACKET);
  })();
});

test(function _sendAuthenticationPacket() {
  var GREETING = {scrambleBuf: new Buffer(21), number: 1}
    , TOKEN = new Buffer(8)
    , PACKET;

  client.user = 'root';
  client.password = 'hello world';
  client.database = 'secrets';

  gently.expect(HIJACKED['./auth'], 'token', function(password, scramble) {
    assert.strictEqual(password, client.password);
    assert.strictEqual(scramble, GREETING.scrambleBuf);
    return TOKEN;
  });

  gently.expect(OutgoingPacketStub, 'new', function(size, number) {
    assert.equal
      ( size
      ,   4 + 4 + 1 + 23
        + client.user.length + 1
        + TOKEN.length + 1
        + client.database.length + 1
      );
    assert.equal(number, GREETING.number + 1);
    PACKET = this;

    gently.expect(PACKET, 'writeNumber', function(bytes, number) {
      assert.strictEqual(bytes, 4);
      assert.strictEqual(client.flags, number);
    });

    gently.expect(PACKET, 'writeNumber', function(bytes, number) {
      assert.strictEqual(bytes, 4);
      assert.strictEqual(client.maxPacketSize, number);
    });

    gently.expect(PACKET, 'writeNumber', function(bytes, number) {
      assert.strictEqual(bytes, 1);
      assert.strictEqual(client.charsetNumber, number);
    });

    gently.expect(PACKET, 'writeFiller', function(bytes) {
      assert.strictEqual(bytes, 23);
    });

    gently.expect(PACKET, 'writeNullTerminated', function(user) {
      assert.strictEqual(user, client.user);
    });

    gently.expect(PACKET, 'writeLengthCoded', function(token) {
      assert.strictEqual(token, TOKEN);
    });

    gently.expect(PACKET, 'writeNullTerminated', function(database) {
      assert.strictEqual(database, client.database);
    });

    gently.expect(client, 'write', function(packet) {
      assert.strictEqual(packet, PACKET);
    });
  });

  client._sendAuthenticationPacket(GREETING);
});

test(function write() {
  var PACKET = {buffer: []}
    , CONNECTION = client._connection = {};

  gently.expect(CONNECTION, 'write', function(buffer) {
    assert.strictEqual(buffer, PACKET.buffer);
  });

  client.write(PACKET);
});

test(function _error() {
  var packet = {errorMessage: 'Super', errorNumber: 127};

  (function testNoCallback() {
    gently.expect(client, 'emit', function(event, err) {
      assert.equal(event, 'error');
      assert.equal(err.message, packet.errorMessage);
      assert.equal(err.number, packet.errorNumber);
    });

    client._error(packet);
  })();

  (function testCallback() {
    client._callback = function() {};

    gently.expect(client, '_callback', function(err) {
      assert.equal(err.message, packet.errorMessage);
    });

    client._error(packet);
  })();
});
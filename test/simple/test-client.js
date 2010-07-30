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
      assert.strictEqual(client.connection, null);
      assert.strictEqual(client.flags, Client.defaultFlags);
      assert.strictEqual(client.maxPacketSize, 0x01000000);
      assert.strictEqual(client.charsetNumber, 8);
      assert.strictEqual(client.parser, null);
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

  client.connect();

  assert.strictEqual(client.connection, CONNECTION);
  assert.strictEqual(client.parser, PARSER);

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
});

test(function _sendAuthenticationPacket() {
  var GREETING = {scrambleBuf: new Buffer(21)}
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

  gently.expect(OutgoingPacketStub, 'new', function(size) {
    assert.equal
      ( size
      ,   4 + 4 + 1 + 23
        + client.user.length + 1
        + TOKEN.length + 1
        + client.database.length + 1
      );
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
  });

  client._sendAuthenticationPacket(GREETING);
});
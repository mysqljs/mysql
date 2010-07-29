require('../common');
var StreamStub = GENTLY.stub('net', 'Stream')
  , ParserStub = GENTLY.stub('./parser')
  , Client = require('mysql/client');

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
    , onConnection = {};

  gently.expect(StreamStub, 'new', function() {
    CONNECTION = this;

    gently.expect(CONNECTION, 'connect', function(port, host) {
      assert.equal(port, client.port);
      assert.equal(host, client.host);
    });

    var events = ['data'];
    gently.expect(CONNECTION, 'on', function(event, fn) {
      assert.equal(event, events.shift());
      onConnection[event] = fn;
    });
  });

  gently.expect(ParserStub, 'new', function() {
    PARSER = this;
  });

  client.connect();

  assert.strictEqual(client.connection, CONNECTION);
  assert.strictEqual(client.parser, PARSER);

  (function testOnConnectionData() {
    var B = {};
    gently.expect(PARSER, 'write', function(b) {
      assert.strictEqual(b, B);
    });

    onConnection.data(B);
  })();
});
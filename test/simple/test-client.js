require('../common');
var StreamStub = GENTLY.stub('net', 'Stream'),
    ParserStub = GENTLY.stub('./parser'),
    OutgoingPacketStub = GENTLY.stub('./outgoing_packet'),
    QueryStub = GENTLY.stub('./query'),
    Parser = require('mysql/parser');

for (var k in Parser) {
  ParserStub[k] = Parser[k];
};

var Client = require('mysql/client');

function test(test) {
  client = new Client();
  gently = new Gently();
  test();
  gently.verify(test.name);
};

test(function constructor() {
  (function testDefaultProperties() {
      var client = new Client();

      assert.strictEqual(client.host, 'localhost');
      assert.strictEqual(client.port, 3306);
      assert.strictEqual(client.user, null);
      assert.strictEqual(client.password, null);
      assert.strictEqual(client.database, '');

      assert.strictEqual(client.typeCast, true);
      assert.strictEqual(client.debug, false);
      assert.strictEqual(client.ending, false);
      assert.strictEqual(client.connected, false);

      assert.strictEqual(client.flags, Client.defaultFlags);
      assert.strictEqual(client.maxPacketSize, 0x01000000);
      assert.strictEqual(client.charsetNumber, Client.UTF8_UNICODE_CI);

      assert.strictEqual(client._greeting, null);
      assert.deepEqual(client._queue, []);
      assert.strictEqual(client._connection, null);
      assert.strictEqual(client._parser, null);
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
  var CONNECTION,
      PARSER,
      onConnection = {},
      CB = function() {
        CB_DELEGATE.apply(this, arguments);
      },
      CB_DELEGATE,
      CONNECT_FN;

  gently.expect(client, '_enqueue', function(task, cb) {
    assert.strictEqual(cb, CB);
    CONNECT_FN = task;
    task();
  });

  gently.expect(StreamStub, 'new', function() {
    CONNECTION = this;

    var events = ['error', 'data', 'end'];
    gently.expect(CONNECTION, 'on', events.length, function(event, fn) {
      assert.equal(event, events.shift());
      onConnection[event] = fn;
      return this;
    });

    gently.expect(CONNECTION, 'connect', function(port, host) {
      assert.equal(port, client.port);
      assert.equal(host, client.host);
    });
  });

  gently.expect(ParserStub, 'new', function() {
    PARSER = this;

    gently.expect(PARSER, 'on', function(event, fn) {
      assert.equal(event, 'packet');

      var PACKET = {};
      gently.expect(client, '_handlePacket', function (packet) {
        assert.strictEqual(packet, PACKET);
      });

      fn(PACKET);
    });
  });

  client.connect(CB);

  assert.strictEqual(client._connection, CONNECTION);
  assert.strictEqual(client._parser, PARSER);

  (function testRandomConnectionError() {
    var ERR = new Error('ouch');
    gently.expect(client, 'emit', function(event, err) {
      assert.equal(event, 'error');
      assert.equal(err, ERR);
    });

    onConnection.error(ERR);
  })();

  (function testConnectionRefusedError() {
    var ERR = new Error('ouch');
    ERR.code = 'ECONNREFUSED';

    CB_DELEGATE = gently.expect(function connectCallback(err) {
      assert.strictEqual(err, ERR);
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

  (function testEndBeforeConnected() {
    gently.expect(client, '_prequeue', 0);
    onConnection.end();
  })();

  (function testUnexpectedEnd() {
    client.connected = true;

    gently.expect(client, '_prequeue', function(fn) {
      assert.strictEqual(fn, CONNECT_FN);
    });

    onConnection.end();
    assert.equal(client.connected, false);
  })();

  (function testExpectedEnd() {
    client.connected = false;
    client.ending = true;

    onConnection.end();
    assert.equal(client.ending, false);
    assert.equal(client.connected, false);
  })();
});

test(function write() {
  var PACKET = {buffer: []},
      CONNECTION = client._connection = {};

  gently.expect(CONNECTION, 'write', function(buffer) {
    assert.strictEqual(buffer, PACKET.buffer);
  });

  client.write(PACKET);
});

test(function query() {
  var PACKET,
      SQL = 'SELECT * FROM über WHERE name = ?',
      FORMATED_SQL = "SELECT * FROM über WHERE name = 'nice'",
      PARAMS = ['nice'],
      CB_STUB,
      CB,
      QUERY,
      queryEmit = {};

  client.typeCast = 'super';

  (function testRegular() {
    gently.expect(client, 'format', function(sql, params) {
      assert.strictEqual(sql, SQL);
      assert.strictEqual(params, PARAMS);
      return FORMATED_SQL;
    });

    gently.expect(QueryStub, 'new', function(properties) {
      QUERY = this;

      assert.equal(properties.typeCast, client.typeCast);
      assert.equal(properties.sql, FORMATED_SQL);

      var events = ['error', 'field', 'row', 'end'];
      gently.expect(QUERY, 'on', events.length, function (event, fn) {
        assert.equal(event, events.shift());
        queryEmit[event] = fn;
        return this;
      });

      gently.expect(client, '_enqueue', function(fn, query) {
        assert.strictEqual(query, QUERY);
        fn();
      });

      gently.expect(OutgoingPacketStub, 'new', function(size) {
        PACKET = this;

        assert.equal(size, 1 + Buffer.byteLength(FORMATED_SQL, 'utf-8'));

        gently.expect(PACKET, 'writeNumber', function(bytes, number) {
          assert.strictEqual(bytes, 1);
          assert.strictEqual(number, Client.COM_QUERY);
        });

        gently.expect(PACKET, 'write', function(str, encoding) {
          assert.equal(str, FORMATED_SQL);
          assert.equal(encoding, 'utf-8');
        });

        gently.expect(client, 'write', function(packet) {
          assert.strictEqual(packet, PACKET);
        });
      });
    });

    CB_STUB = function() {
      CB.apply(this, arguments);
    };

    var r = client.query(SQL, PARAMS, CB_STUB);
    assert.strictEqual(r, QUERY);

    (function testQueryErr() {
      var ERR = new Error('oh no');
      CB = gently.expect(function errCb(err) {
        assert.strictEqual(err, ERR);
      });

      gently.expect(client, '_dequeue');

      queryEmit.error(ERR);
    })();

    (function testQuerySimpleEnd() {
      var RESULT = {};
      CB = gently.expect(function okCb(err, result) {
        assert.strictEqual(result, RESULT);
      });

      gently.expect(client, '_dequeue');
      queryEmit.end(RESULT);
    })();

    (function testFieldsAndRows() {
      var FIELD_1 = {name: 'A'},
          FIELD_2 = {name: 'B'},
          ROW_1 = {},
          ROW_2 = {};

      queryEmit.field(FIELD_1);
      queryEmit.field(FIELD_2);
      queryEmit.row(ROW_1);
      queryEmit.row(ROW_2);

      CB = gently.expect(function okCb(err, rows, fields) {
        assert.strictEqual(rows[0], ROW_1);
        assert.strictEqual(rows[1], ROW_2);
        assert.strictEqual(fields.A, FIELD_1);
        assert.strictEqual(fields.B, FIELD_2);
      });

      gently.expect(client, '_dequeue');

      queryEmit.end();
    })();
  })();

  (function testNoParams() {
    gently.expect(QueryStub, 'new', function() {
      gently.expect(this, 'on', 4, function() {
        return this;
      });

      gently.expect(client, '_enqueue');
    });

    client.query(SQL, CB_STUB);
  })();

  (function testNoCb() {
    gently.expect(QueryStub, 'new', function() {
      QUERY = this;
      queryEmit = {};

      var events = ['error', 'end'];
      gently.expect(QUERY, 'on', events.length, function (event, fn) {
        assert.equal(event, events.shift());
        queryEmit[event] = fn;
        return this;
      });

      gently.expect(client, '_enqueue', function() {
        (function testQueryErrWithoutListener() {
          var ERR = new Error('oh oh');
          gently.expect(QUERY, 'listeners', function (event) {
            assert.equal(event, 'error');
            return [1];
          });

          gently.expect(client, 'emit', function (event, err) {
            assert.equal(event, 'error');
            assert.strictEqual(err, ERR);
          });
          gently.expect(client, '_dequeue');
          queryEmit.error(ERR);
        })();

        (function testQueryErrWithListener() {
          var ERR = new Error('oh oh');
          gently.expect(QUERY, 'listeners', function (event) {
            assert.equal(event, 'error');
            return [1, 2];
          });
          gently.expect(client, 'emit', 0);
          gently.expect(client, '_dequeue');
          queryEmit.error(ERR);
        })();

        (function testQuerySimpleEnd() {
          gently.expect(client, '_dequeue');
          queryEmit.end();
        })();
      });
    });

    client.query(SQL);
  })();
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
  assert.equal(client.escape([1,2,3]), "'1,2,3'");

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

test(function ping() {
  var CB = function() {},
      PACKET;

  gently.expect(client, '_enqueue', function (fn, cb) {
    gently.expect(OutgoingPacketStub, 'new', function(size, number) {
      PACKET = this;
      assert.equal(size, 1);

      gently.expect(this, 'writeNumber', function (length, val) {
        assert.equal(length, 1);
        assert.equal(val, Client.COM_PING);
      });

      gently.expect(client, 'write', function (packet) {
        assert.strictEqual(packet, PACKET);
      });
    });
    fn();

    assert.strictEqual(cb, CB);
  });

  client.ping(CB);
});

test(function statistics() {
  var CB = function() {},
      PACKET;

  gently.expect(client, '_enqueue', function (fn, cb) {
    gently.expect(OutgoingPacketStub, 'new', function(size, number) {
      PACKET = this;
      assert.equal(size, 1);

      gently.expect(this, 'writeNumber', function (length, val) {
        assert.equal(length, 1);
        assert.equal(val, Client.COM_STATISTICS);
      });

      gently.expect(client, 'write', function (packet) {
        assert.strictEqual(packet, PACKET);
      });
    });
    fn();

    assert.strictEqual(cb, CB);
  });

  client.statistics(CB);
});

test(function useDatabase() {
  var CB = function() {},
      DB = 'foo',
      PACKET;

  gently.expect(client, '_enqueue', function (fn, cb) {
    gently.expect(OutgoingPacketStub, 'new', function(size, number) {
      PACKET = this;
      assert.equal(size, 1 + Buffer.byteLength(DB, 'utf-8'));

      gently.expect(this, 'writeNumber', function (length, val) {
        assert.equal(length, 1);
        assert.equal(val, Client.COM_INIT_DB);
      });

      gently.expect(PACKET, 'write', function(str, encoding) {
        assert.equal(str, DB);
        assert.equal(encoding, 'utf-8');
      });

      gently.expect(client, 'write', function (packet) {
        assert.strictEqual(packet, PACKET);
      });
    });
    fn();

    assert.strictEqual(cb, CB);
  });

  client.useDatabase(DB, CB);
});

test(function destroy() {
  var CONNECTION = client._connection = {};

  gently.expect(CONNECTION, 'destroy');
  client.destroy();
});

test(function end() {
  var CB = function() {},
      PACKET;

  client._connection = {};

  gently.expect(client, '_enqueue', function (fn, cb) {
    assert.equal(client.ending, true);

    gently.expect(OutgoingPacketStub, 'new', function(size, number) {
      PACKET = this;
      assert.equal(size, 1);

      gently.expect(this, 'writeNumber', function (length, val) {
        assert.equal(length, 1);
        assert.equal(val, Client.COM_QUIT);
      });

      gently.expect(client, 'write', function (packet) {
        assert.strictEqual(packet, PACKET);
      });

      gently.expect(client._connection, 'on', function (event, fn) {
        assert.equal(event, 'end');
        assert.strictEqual(fn, CB);
      });

      gently.expect(client, '_dequeue');
    });
    fn();
  });

  client.end(CB);
});

test(function _prequeue() {
  var FN = gently.expect(function fn() {}),
      CB = function() {};

  client._queue.push(1);

  client._prequeue(FN, CB);
  assert.equal(client._queue.length, 2);
  assert.strictEqual(client._queue[0].fn, FN);
  assert.strictEqual(client._queue[0].delegate, CB);
});

test(function _enqueue() {
  var FN = gently.expect(function fn() {}),
      CB = function() {};

  client._enqueue(FN, CB);
  assert.equal(client._queue.length, 1);
  assert.strictEqual(client._queue[0].fn, FN);
  assert.strictEqual(client._queue[0].delegate, CB);

  // Make sure fn is only called once
  client._enqueue(FN, CB);
  assert.equal(client._queue.length, 2);
  assert.strictEqual(client._queue[1].fn, FN);
  assert.strictEqual(client._queue[1].delegate, CB);
});

test(function _dequeue() {
  (function testEmptyQueue() {
    client._dequeue();
  })();

  (function testExecuteNext() {
    var TASK = {fn: gently.expect(function () {})};

    client._queue = [{}, TASK];
    client._dequeue();
    assert.equal(client._queue.length, 1);
    assert.strictEqual(client._queue[0], TASK);
  })();
});

test(function _handlePacket() {
  var USER_OBJECT = {};

  (function testGreeting() {
    var PACKET = {type: Parser.GREETING_PACKET};

    gently.expect(client, '_sendAuth', function (packet) {
      assert.strictEqual(packet, PACKET);
    });

    client._handlePacket(PACKET);
  })();

  (function testUseOldPasswordProtocol() {
    client._greeting = {};
    var PACKET = {type: Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET};

    gently.expect(client, '_sendOldAuth', function (greeting) {
      assert.strictEqual(greeting, client._greeting);
    });

    client._handlePacket(PACKET);
  })();

  (function testNormalOk() {
    var PACKET = {type: Parser.OK_PACKET};

    gently.expect(Client, '_packetToUserObject', function (packet) {
      assert.strictEqual(packet, PACKET);
      return USER_OBJECT;
    });

    var TASK = {delegate: gently.expect(function okCb(err, packet) {
        assert.strictEqual(packet, USER_OBJECT);
      })};
    gently.expect(client, '_dequeue');

    client._queue = [TASK];
    client._handlePacket(PACKET);
    assert.equal(client.connected, true);
  })();

  (function testNoDelegateOk() {
    var PACKET = {type: Parser.OK_PACKET};
    client._queue = [{}];
    client.connected = false;

    gently.expect(client, '_dequeue');
    client._handlePacket(PACKET);
    assert.equal(client.connected, true);
  })();

  (function testNormalError() {
    var PACKET = {type: Parser.ERROR_PACKET};

    gently.expect(Client, '_packetToUserObject', function (packet) {
      assert.strictEqual(packet, PACKET);
      return USER_OBJECT;
    });

    var TASK = {delegate: gently.expect(function errCb(packet) {
        assert.strictEqual(packet, USER_OBJECT);
      })};
    gently.expect(client, '_dequeue');

    client._queue = [TASK];
    client._handlePacket(PACKET);
  })();

  (function testNoDelegateError() {
    var PACKET = {type: Parser.ERROR_PACKET};
    client._queue = [{}];

    gently.expect(Client, '_packetToUserObject', function (packet) {
      assert.strictEqual(packet, PACKET);
      return USER_OBJECT;
    });

    gently.expect(client, 'emit', function(event, err) {
      assert.equal(event, 'error');
      assert.strictEqual(err, USER_OBJECT);
    });
    gently.expect(client, '_dequeue');
    client._handlePacket(PACKET);
  })();

  (function testQueryDelegate() {
    gently.expect(QueryStub, 'new');
    var PACKET = {},
        QUERY = new QueryStub();

    client._queue = [{delegate: QUERY}];

    gently.expect(QUERY, '_handlePacket', function(packet) {
      assert.strictEqual(packet, PACKET);
    });

    client._handlePacket(PACKET);
  })();
});

test(function _sendAuth() {
  var GREETING = {scrambleBuffer: new Buffer(20), number: 1},
      TOKEN = new Buffer(20),
      PACKET;

  client.user = 'root';
  client.password = 'hello world';
  client.database = 'secrets';

  gently.expect(HIJACKED['./auth'], 'token', function(password, scramble) {
    assert.strictEqual(password, client.password);
    assert.strictEqual(scramble, GREETING.scrambleBuffer);
    return TOKEN;
  });

  gently.expect(OutgoingPacketStub, 'new', function(size, number) {
    assert.equal(size, (
      4 + 4 + 1 + 23 +
      client.user.length + 1 +
      TOKEN.length + 1 +
      client.database.length + 1
    ));

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

  client._sendAuth(GREETING);
  assert.strictEqual(client._greeting, GREETING);
});

test(function _packetToUserObject() {
  gently.restore(Client, '_packetToUserObject');

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

test(function _sendOldAuth() {
  var GREETING = {scrambleBuffer: new Buffer(8), number: 1},
      TOKEN = new Buffer(8),
      PACKET;

  client.user = 'root';
  client.password = 'hello world';

  gently.expect(HIJACKED['./auth'], 'scramble323', function(scramble, password) {
    assert.strictEqual(scramble, GREETING.scrambleBuffer);
    assert.strictEqual(password, client.password);
    return TOKEN;
  });

  gently.expect(OutgoingPacketStub, 'new', function(size, number) {
    assert.equal(size, TOKEN.length + 1);

    assert.equal(number, GREETING.number + 3);
    PACKET = this;

    gently.expect(PACKET, 'write', function(token) {
      assert.strictEqual(token, TOKEN);
    });

    gently.expect(PACKET, 'writeFiller', function(bytes) {
      assert.strictEqual(bytes, 1);
    });

    gently.expect(client, 'write', function(packet) {
      assert.strictEqual(packet, PACKET);
    });
  });

  client._sendOldAuth(GREETING);
});

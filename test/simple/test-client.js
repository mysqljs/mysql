require('../common');
var StreamStub = GENTLY.stub('net', 'Stream'),
    ParserStub = GENTLY.stub('./parser'),
    OutgoingPacketStub = GENTLY.stub('./outgoing_packet'),
    QueryStub = GENTLY.stub('./query'),
    Parser = require('mysql/parser');

for (var k in Parser) {
  ParserStub[k] = Parser[k];
}

var Client = require('mysql/client');

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
      onParser = {},
      CB = function() {};

  gently.expect(client, '_enqueue', function(task, cb) {
    assert.strictEqual(cb, CB);
    task();
  });

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

  client.connect(CB);

  assert.strictEqual(client._connection, CONNECTION);
  assert.strictEqual(client._parser, PARSER);

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

  (function testPacketDispatch() {
    var PACKET = {type: Parser.ERROR_PACKET};

    client[Parser.ERROR_PACKET] = gently.expect(function(packet) {
      assert.strictEqual(packet, PACKET);
    });

    onParser.packet(PACKET);
  })();
});

test(function GREETING_PACKET() {
  var GREETING = {scrambleBuffer: new Buffer(20), number: 1},
      TOKEN = new Buffer(8),
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

  client[Parser.GREETING_PACKET](GREETING);
});

test(function RESULT_SET_HEADER_PACKET() {
  var PACKET = {type: Parser.RESULT_SET_HEADER_PACKET};

  (function testQueueEmptyError() {
    gently.expect(client, 'emit', function (event, err) {
      assert.equal(event, 'error');
      assert.equal(err.message, 'unexpected query packet, no packet was expected');
    });

    client[Parser.RESULT_SET_HEADER_PACKET](PACKET);
  })();

  (function testUnexpectedOrderError() {
    client._queue = [{delegate: {}}];

    gently.expect(client, 'emit', function (event, err) {
      assert.equal(event, 'error');
      assert.equal(err.message, 'unexpected query packet, another packet was expected');
    });

    client[Parser.RESULT_SET_HEADER_PACKET](PACKET);
  })();


  (function testDelegation() {
    var QUERY = new QueryStub();
    client._queue = [{delegate: QUERY}];

    //gently.expect(QUERY, Parser.RESULT_SET_HEADER_PACKET, function () {
    //});

    client[Parser.RESULT_SET_HEADER_PACKET](PACKET);
  })();
});

test(function FIELD_PACKET() {
  assert.strictEqual(
    client[Parser.FIELD_PACKET],
    client[Parser.RESULT_SET_HEADER_PACKET]
  );
});

test(function EOF_PACKET() {
  assert.strictEqual(
    client[Parser.EOF_PACKET],
    client[Parser.RESULT_SET_HEADER_PACKET]
  );
});

test(function ROW_DATA_PACKET() {
  assert.strictEqual(
    client[Parser.ROW_DATA_PACKET],
    client[Parser.RESULT_SET_HEADER_PACKET]
  );
});

test(function write() {
  var PACKET = {buffer: []},
      CONNECTION = client._connection = {};

  gently.expect(CONNECTION, 'write', function(buffer) {
    assert.strictEqual(buffer, PACKET.buffer);
  });

  client.write(PACKET);
});

test(function _errorPacket() {
  var packet = {errorMessage: 'Super', errorNumber: 127};

  gently.expect(client, '_dequeue', function(err) {
    assert.ok(err instanceof Error);
    assert.equal(err.message, packet.errorMessage);
    assert.equal(err.number, packet.errorNumber);
  });

  client[Parser.ERROR_PACKET](packet);
});

test(function _okPacket() {
  var packet = {
    affectedRows: 127,
    insertId: 23,
    serverStatus: 2,
    message: 'hello world\0\0',
  };

  gently.expect(client, '_dequeue', function(err, result) {
    assert.strictEqual(err, null);
    packet.message = 'hello world';
    assert.notStrictEqual(result, packet);
    assert.deepEqual(result, packet);
  });

  client[Parser.OK_PACKET](packet);
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

  // Test that queries get assigned to ._query
  //var QUERY = new QueryStub();
  //client._queue = [];
  //client._enqueue(FN, QUERY);

  //assert.strictEqual(client._query, :);
});

test(function _dequeue() {
  (function testErrorWithCb() {
    var ERR = new Error('oh no!'),
        CB = gently.expect(function cb(err) {
          assert.strictEqual(err, ERR);
        });

    client._queue = [{delegate: CB}];
    client._dequeue(ERR);
    assert.equal(client._queue.length, 0);
  })();

  (function testErrWithoutCb() {
    var ERR = new Error('oh no!');
    client._queue = [{}];

    gently.expect(client, 'emit', function(event, err) {
      assert.equal(event, 'error');
      assert.strictEqual(err, ERR);
    });

    client._dequeue(ERR);
  })();

  (function testExecuteNext() {
    var FN = gently.expect(function fn() {});
    client._queue = [{}, {fn: FN}];

    client._dequeue();
    assert.equal(client._queue.length, 1);
  })();

  (function testQueryDelegateOk() {
    var query = new QueryStub(), RESULT = {};
    client._queue = [{delegate: query}];

    gently.expect(query, 'emit', function (event, result) {
      assert.equal(event, 'end');
      assert.strictEqual(result, RESULT);
    });

    client._dequeue(null, RESULT);
  })();

  (function testQueryDelegateErr() {
    var query = new QueryStub(), ERR = new Error('not good');
    client._queue = [{delegate: query}];

    gently.expect(query, 'emit', function (event, err) {
      assert.equal(event, 'error');
      assert.strictEqual(err, ERR);
    });

    client._dequeue(ERR);
  })();
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

  (function testRegular() {
    gently.expect(client, 'format', function(sql, params) {
      assert.strictEqual(sql, SQL);
      assert.strictEqual(params, PARAMS);
      return FORMATED_SQL;
    });

    gently.expect(QueryStub, 'new', function() {
      QUERY = this;

      var events = ['error', 'fields', 'row', 'end'];
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
      assert.strictEqual(queryEmit.error, CB_STUB);
    })();

    (function testQuerySimpleEnd() {
      var RESULT = {};
      CB = gently.expect(function okCb(err, result) {
        assert.strictEqual(result, RESULT);
      });

      queryEmit.end(RESULT);
    })();

    (function testFieldsAndRows() {
      var FIELDS = {}
        , ROW_1 = {}
        , ROW_2 = {};

      queryEmit.fields(FIELDS);
      queryEmit.row(ROW_1);
      queryEmit.row(ROW_2);

      CB = gently.expect(function okCb(err, rows, fields) {
        assert.strictEqual(rows[0], ROW_1);
        assert.strictEqual(rows[1], ROW_2);
        assert.strictEqual(fields, FIELDS);
      });

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
      gently.expect(client, '_enqueue');
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

test(function end() {
  client._connection = {};

  gently.expect(client._connection, 'end');

  client.end();
});

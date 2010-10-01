require('../../common');

var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently(),
    tests = [];

client.connect();

function addTest(test) {
  tests.push(test);
};

function runTests() {
  // Some tests depend on timing, so run only one test at a time
  var test = tests.shift(),
      done = function done() {
        gently.verify(test.name);
        if (tests.length) {
          process.nextTick(runTests);
        } else {
          client.end();
        }
      };

  console.log('.... ' + test.name);
  test(done);
};

addTest(function prepareTestTable(done) {
  client.query(
    'CREATE DATABASE '+TEST_DB,
    gently.expect(function createDbCb(err) {
      if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
        throw err;
      }
    })
  );

  client.query(
    'USE '+TEST_DB,
    gently.expect(function useDbCb(err) {
      if (err) {
        throw err;
      }
    })
  );

  client.query(
    'CREATE TEMPORARY TABLE '+TEST_TABLE+
    '(idx INT(11) NOT NULL, foo TEXT NOT NULL, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP);',
    gently.expect(function createTableCb(err) {
      if (err) {
        throw err;
      }
    })
  );

  var callbacks = 0;
  for (var i = 0; i < 100; i++) {
    client.query(
      'INSERT INTO '+TEST_TABLE+' '+
      'SET idx = ?, foo = ?',
      [i, 'just some randomt ext'],
      gently.expect(function insertCb(err) {
        if (err) {
          throw err;
        }
        if (++callbacks === 100) {
          done();
        }
      })
    );
  }
});

addTest(function testIntermittentPause(done) {
  var query = client.query('SELECT * FROM '+TEST_TABLE),
      paused = false,
      idx = 0;

  query.on('field', gently.expect(new Number(3), function fieldCb(field) {
    assert.equal(paused, false);

    // After the idx field, delay and resume after 1s
    if (field.name === 'idx') {
      paused = true;
      query.pause();
      setTimeout(function() {
        paused = false;
        query.resume();
      }, 1000);
    }
  }));

  query.on('row', gently.expect(new Number(100), function rowCb(row) {
    assert.equal(paused, false);

    // Check for out-of-order rows
    assert.equal(row.idx, idx++);

    // At row 25 we're gonna block the event loop for a few secs,
    // so the next buffer the parser receives contains multiple rows for sure
    if (idx === 25) {
      for(var start = new Date(); (new Date()) - start < 2000; );

    // At row 50 we'll issue pause and resume 10k times in the same tick
    // to test for stack overflow and row handler recursion/concurrency issues
    } else if (idx === 50) {
      for (var i = 0; i < 10000; i++) {
        query.pause();
        query.resume();
      }

    // At row 75 we'll issue pause and resume 100 times outside the row handler
    // to check if a resume call can be intercepted with an immediate pause call
    } else if (idx === 75) {
      paused = true;
      query.pause();

      process.nextTick(function() {
        for (var i = 0; i < 100; i++) {
          query.resume();
          query.pause();
        }

        process.nextTick(function() {
          paused = false;
          query.resume();
        });
      });

    // Every other 3 rows pause and resume after 100ms
    } else if (idx % 3 === 0) {
      paused = true;
      query.pause();
      setTimeout(function() {
        paused = false;
        query.resume();
      }, 100);
    }
  }));

  query.on('end', gently.expect(function endCb() {
    done();
  }));
});

addTest(function testImmediatePause(done) {
  var query1 = client.query('SELECT * FROM '+TEST_TABLE),
      query2 = client.query('SELECT * FROM '+TEST_TABLE),
      paused1 = false,
      paused2 = false,
      idx1 = 0,
      idx2 = 0;

  paused1 = true;
  query1.pause();

  setTimeout(function() {
    paused1 = false;
    query1.resume();
  }, 1000);

  paused2 = true;
  query2.pause();

  query1.on('field', gently.expect(new Number(3), function fieldCb1(field) {
    assert.equal(paused1, false);
  }));
  query1.on('row', gently.expect(new Number(100), function rowCb1(row) {
    assert.equal(paused1, false);
    assert.equal(row.idx, idx1++);
  }));
  query1.on('end', gently.expect(function endCb1() {
    paused2 = false;
    query2.resume();
  }));

  query2.on('field', gently.expect(new Number(3), function fieldCb2(field) {
    assert.equal(paused2, false);
  }));
  query2.on('row', gently.expect(new Number(100), function rowCb2(row) {
    assert.equal(paused2, false);
    assert.equal(row.idx, idx2++);
  }));
  query2.on('end', gently.expect(function endCb2() {
    done();
  }));
});

addTest(function testCallbackSelect(done) {
  var query,
      paused = false,
      cb = gently.expect(function okCb(error, rows, fields) {
        assert.equal(paused, false);
        assert.ifError(error);
        assert.equal(rows.length, 100);
        assert.equal(Object.keys(fields).length, 3);
        done();
      });

  query = client.query('SELECT * FROM '+TEST_TABLE, [], cb),

  paused = true;
  query.pause();

  setTimeout(function() {
    paused = false;
    query.resume();
  }, 1000);
});

addTest(function testCallbackUpdate(done) {
  var query,
      paused = false,
      cb = gently.expect(function okCb(error, result) {
        assert.equal(paused, false);
        assert.ifError(error);
        assert.equal(result.affectedRows, 100);
        done();
      });

  query = client.query('UPDATE '+TEST_TABLE + ' ' +
                       'SET idx = idx', [], cb);

  paused = true;
  query.pause();

  setTimeout(function() {
    paused = false;
    query.resume();
  }, 1000);
});

addTest(function testCallbackError(done) {
  var query,
      paused = false,
      cb = gently.expect(function errCb(error, fields, rows) {
        assert.equal(paused, false);
        assert.ok(error);
        done();
      });

  query = client.query('bad $#%^!! query', [], cb),

  paused = true;
  query.pause();

  setTimeout(function() {
    paused = false;
    query.resume();
  }, 1000);
});

addTest(function testThrowsSelect(done) {
  var query = client.query('SELECT * FROM '+TEST_TABLE);

  query.on('end', gently.expect(function okCb() {
    assert.throws(function() {
      query.pause();
    });
    assert.throws(function() {
      query.resume();
    });
    done();
  }));
});

addTest(function testThrowsUpdate(done) {
  var query = client.query('UPDATE '+TEST_TABLE + ' ' +
                           'SET idx = idx');

  query.on('end', gently.expect(function okCb(result) {
    assert.equal(result.affectedRows, 100);
    assert.throws(function() {
      query.pause();
    });
    assert.throws(function() {
      query.resume();
    });
    done();
  }));
});

addTest(function testThrowsError(done) {
  var query = client.query('bad $#%^!! query');

  query.on('error', gently.expect(function errCb(packet) {
    assert.throws(function() {
      query.pause();
    });
    assert.throws(function() {
      query.resume();
    });
    done();
  }));
});

runTests();
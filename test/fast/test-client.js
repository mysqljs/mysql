var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.fast();
var Client = require(common.dir.lib + '/client');

var client;
test.before(function() {
  client = new Client();
});

test('#format() does not manipulate params parameter', function() {
  var sql = '?';
  var params = [1];

  client.format(sql, params);
  assert.equal(params.length, 1);
});

test('#format() does not quote floats', function() {
  var params = [1.23];

  var sql = client.format('?', params);
  assert.strictEqual(sql, '1.23');
});

// https://github.com/felixge/node-mysql/issues/96
test('Timeout reconnect works with empty queue', function() {
  // A non-error packet
  var packet = {};

  // This must not throw an error
  client._handlePacket(packet);
});

test('#format() does not substitute ? in string literals', function() {
  
  /**
   * runs subtest
   * @param input Input string
   * @param {Array} params Array of subsitutions for placeholders
   * @param expected Expected output string
   */
  function run(input, params, expected) {
    assert.strictEqual(expected, client.format(input, params));
  }

  /*
   * Single quotes
   */
  // various positions
  // ? '?' ? => 1 '?' 2
  run(
    "? '? ' ?", [1, 2],
    "1 '? ' 2"
  );
  
  // trivial test: 
  // '?' => '?' 
  run(
    "'?'", [],
    "'?'"
  );
  
  // escaped single quote
  // '? \' ?' ? => '? \' ?' 1
  run(
    "'? \\' ?' ?", [1],
    "'? \\' ?' 1"
  );
  
  run(
    "'? '' ?' ?", [1],
    "'? '' ?' 1"
  );

  /*
   * Double quotes
   */
  // various positions
  // ? "?" ? => 1 "?" 2
  run(
    '? "? " ?', [1, 2],
    '1 "? " 2'
  );
  
  // trivial test: 
  // "?" => "?" 
  run(
    '"?"', [],
    '"?"'
  );
  
  // escaped quote
  // "? \" ?" ? => "? \" ?" 1
  run(
    '"? \\" ?" ?', [1],
    '"? \\" ?" 1'
  );
  
  run(
    '"? "" ?" ?', [1],
    '"? "" ?" 1'
  );


  /*
   * Backticks 
   */
  // various positions
  // ? `?` ? => 1 `?` 2
  run(
    '? `? ` ?', [1, 2],
    '1 `? ` 2'
  );
  
  // trivial test: 
  // `?` => `?` 
  run(
    '`?`', [],
    '`?`'
  );
  
  // escaped backtick.
  // according to mysql spec, double-backtick is the only way to escape
  //                          (do not give double backticks to inmates :))
  // `? `` ?` ? => `? `` ?` 1
  run(
    '`? `` ?` ?', [1],
    '`? `` ?` 1'
  );

  // make sure the backslash doesnt work
  // `? \` ? => `? \` 1
  run(
    '`? \\` ?', [1],
    '`? \\` 1'
  );

  /*
   * Various mixed quotations
   */

  // in single quote
  // ? '? "? `?' ? => 1 '? "? `?' 2
  run(
    '? \'? "? `?\' ?', [1, 2],
    '1 \'? "? `?\' 2'
  );

  // in doble quote
  // ? "? '? `?" ? => 1 "? '? `?" 2
  run(
    '? "? \'? `?" ?', [1, 2],
    '1 "? \'? `?" 2'
  );

  // in backticks
  // ? `? '? "?` ? => 1 `? '? "?` 2
  run(
    '? `? \'? "?` ?', [1, 2],
    '1 `? \'? "?` 2'
  );


  // and some cumulatie test
  // ? single:' ? "? ''? ' ? ' \'\"? \\? \' ' double:"? "" " ? " '`\"? " ?
  // 1 single:' ? "? ''? ' 2 ' \'\"? \\? \' ' double:"? "" " 3 " '`\"? " 4
  run(
    '? single:\' ? "? \'\'? \' ? \' \\\'\\"? \\\\? \\\' \' double:"? "" " ? " \'`\\"? " ?', [1, 2, 3, 4],
    '1 single:\' ? "? \'\'? \' 2 \' \\\'\\"? \\\\? \\\' \' double:"? "" " 3 " \'`\\"? " 4'
  );

});

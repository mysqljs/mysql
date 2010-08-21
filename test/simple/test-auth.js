require('../common');
var auth = require('mysql/auth');

function test(test) {
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function sha1() {
  assert.deepEqual(
    auth.sha1('root'),
    new Buffer([
      220, 118, 233, 240, 192,
      0, 110, 143, 145, 158,
      12, 81, 92, 102, 219,
      186, 57, 130, 247, 133
    ]).toString('binary')
  );
});

test(function xor() {
  var a = new Buffer([170, 220]),        // 10101010 11011100
      b = new Buffer([220, 170]),        // 11011100 10101010
      expected = new Buffer([118, 118]); // 01110110 01110110

  assert.deepEqual(auth.xor(a.toString('binary'), b.toString('binary')), expected);
});

test(function token() {
  var SCRAMBLE = new Buffer([0, 1, 2, 3, 4, 5]);

  (function testRegular() {
    var PASS = 'root',
        STAGE_1 = auth.sha1(PASS),
        TOKEN = auth.xor(
          auth.sha1(new Buffer(SCRAMBLE + auth.sha1(STAGE_1), 'binary')),
          STAGE_1
         );

    assert.deepEqual(auth.token('root', SCRAMBLE), TOKEN);
  })();

  (function testNoPassword() {
    assert.deepEqual(auth.token(null, SCRAMBLE), new Buffer(0));
  })();
});

(function testHashPassword() {
  var BUFFER;
  gently.expect(auth, 'int32Write', 2, function (buffer, number, offset) {
    assert.equal(number, [1732607522, 1780094397][offset / 4]);
    assert.equal(buffer.length, 8);
    BUFFER = buffer;
  });

  var result = auth.hashPassword('root');
  assert.strictEqual(result, BUFFER);
})();

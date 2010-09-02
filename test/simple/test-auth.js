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

test(function hashPassword() {
  function verify(password, bytes){
    var expected = new Buffer(bytes);
    var actual = auth.hashPassword(password);

    assert.deepEqual(actual, expected);
  }

  verify('root', [0x67, 0x45, 0x7E, 0x22, 0x6a, 0x1a, 0x15, 0xbd]);
  verify('long password test', [0x6c, 0x24, 0x68, 0x41, 0x2c, 0xa6, 0x86, 0x56]);
  verify('saf789yasfbsd89f', [0x6c, 0x9b, 0x2f, 0x07, 0x17, 0xeb, 0x95, 0xc6]);
});


test(function randomInit() {
  function verify(in1, in2, out1, out2){
    var r = auth.randomInit(in1, in2);
    assert.equal(out1, r.seed1);
    assert.equal(out2, r.seed2);
  }

  verify(0x00000000, 0x00000000, 0x00000000, 0x00000000);
  verify(0x0000FFFF, 0x0000FFFF, 0x0000ffff, 0x0000ffff);
  verify(0x50000000, 0x50000000, 0x10000001, 0x10000001);
  verify(0xFFFFFFFF, 0xFFFFFFFF, 0x00000003, 0x00000003);
  verify(3252345, 7149734, 0x0031a079, 0x006d18a6);
});

test(function myRnd() {
  function verifySequence(seed1, seed2, expected){
    var r = auth.randomInit(seed1, seed2);
    for (var i = 0; i < expected.length; i++){
      var n = auth.myRnd(r);

      // we will test to 14 digits, since
      // we only ever use this function mutliplied
      // by small numbers anyway

      var a = ':'+n;
      var b = ':'+expected[i];

      assert.equal(a.substr(1, 16), b.substr(1, 16));
    }
  }

  verifySequence(3252345, 7149734, [
    0.0157456556481734,
    0.0696413620092360,
    0.3009698738353047,
    0.2959253138824602,
    0.5767169786400320,
    0.9958089822864243,
    0.2488940062456708,
    0.2570431151027261,
    0.5385335875102631,
    0.9215386229767824,
  ]);
});

test(function scramble323() {
  function verify(message, password, bytes){
    var expected = new Buffer(bytes);
    var actual = auth.scramble323(new Buffer(message), password);

    assert.deepEqual(actual, expected);
  }

  verify('8bytesofstuff', 'root', [0x5a, 0x4d, 0x46, 0x47, 0x43, 0x53, 0x58, 0x5f]);
  verify('e8cf00cec9ec825af22', 'saf789yasfbsd', [0x4d, 0x54, 0x5b, 0x47, 0x5f, 0x52, 0x4d, 0x45]);
});

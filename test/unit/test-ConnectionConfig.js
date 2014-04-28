var common           = require('../common');
var test             = require('utest');
var assert           = require('assert');
var Charsets         = require(common.lib + '/protocol/constants/charsets');
var ConnectionConfig = require(common.lib + '/ConnectionConfig');

test('ConnectionConfig#Constructor', {
  'takes user,pw,host,port,db from url string': function() {
    var url    = 'mysql://myuser:mypass@myhost:3333/mydb';
    var config = new ConnectionConfig(url);

    assert.equal(config.host, 'myhost');
    assert.equal(config.port, 3333);
    assert.equal(config.user, 'myuser');
    assert.equal(config.password, 'mypass');
    assert.equal(config.database, 'mydb');
  },

  'allows additional options via url query': function() {
    var url    = 'mysql://myhost/mydb?debug=true&charset=BIG5_CHINESE_CI';
    var config = new ConnectionConfig(url);

    assert.equal(config.host, 'myhost');
    assert.equal(config.port, 3306);
    assert.equal(config.database, 'mydb');
    assert.equal(config.debug, true);
    assert.equal(config.charsetNumber, Charsets.BIG5_CHINESE_CI);
  },

  'allows case-insensitive charset name': function() {
    var config = new ConnectionConfig({
      charset: 'big5_chinese_ci',
    });

    assert.equal(config.charsetNumber, Charsets.BIG5_CHINESE_CI);
  },

  'throws on unknown charset': function() {
    var error;

    try {
      var config = new ConnectionConfig({
        charset: 'INVALID_CHARSET',
      });
    } catch (err) {
      error = err;
    }

    assert.ok(error);
    assert.equal(error.name, 'TypeError');
    assert.equal(error.message, 'Unknown charset \'INVALID_CHARSET\'');
  },
});

test('ConnectionConfig#Constructor.connectTimeout', {
  'defaults to 2 minutes': function() {
    var config = new ConnectionConfig({});

    assert.equal(config.connectTimeout, (2 * 60 * 1000));
  },

  'undefined uses default': function() {
    var config = new ConnectionConfig({
      connectTimeout: undefined
    });

    assert.equal(config.connectTimeout, (2 * 60 * 1000));
  },

  'can set to null': function() {
    var config = new ConnectionConfig({
      connectTimeout: null
    });

    assert.equal(config.connectTimeout, null);
  },

  'can set to 0': function() {
    var config = new ConnectionConfig({
      connectTimeout: 0
    });

    assert.equal(config.connectTimeout, 0);
  },

  'can set to custom value': function() {
    var config = new ConnectionConfig({
      connectTimeout: 10000
    });

    assert.equal(config.connectTimeout, 10000);
  },
});

var common           = require('../common');
var test             = require('utest');
var assert           = require('assert');
var ConnectionConfig = common.ConnectionConfig;

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

  'work with password containing colon': function() {
    var url    = 'mysql://myuser:my:pass@myhost:3333/mydb';
    var config = new ConnectionConfig(url);

    assert.equal(config.host, 'myhost');
    assert.equal(config.port, 3333);
    assert.equal(config.user, 'myuser');
    assert.equal(config.password, 'my:pass');
    assert.equal(config.database, 'mydb');
  },

  'allows additional options via url query': function() {
    var url    = 'mysql://myhost/mydb?debug=true&charset=BIG5_CHINESE_CI';
    var config = new ConnectionConfig(url);

    assert.equal(config.host, 'myhost');
    assert.equal(config.port, 3306);
    assert.equal(config.database, 'mydb');
    assert.equal(config.debug, true);
    assert.equal(config.charsetNumber, common.Charsets.BIG5_CHINESE_CI);
  },

  'accepts client flags': function() {
    var config = new ConnectionConfig({ flags: '-FOUND_ROWS' });
    assert.equal(config.clientFlags & common.ClientConstants.CLIENT_FOUND_ROWS, 0);
  },

  'ignores unknown client flags': function() {
    var config1 = new ConnectionConfig({});
    var config2 = new ConnectionConfig({ flags: '+HAPPY_MYSQL' });
    assert.equal(config1.clientFlags, config2.clientFlags);
  },

  'blacklists unsupported client flags': function() {
    var config = new ConnectionConfig({ flags: '+CONNECT_ATTRS' });
    assert.equal(config.clientFlags & common.ClientConstants.CLIENT_CONNECT_ATTRS, 0);
  }
});

test('ConnectionConfig#Constructor.charset', {
  'accepts charset name': function() {
    var config = new ConnectionConfig({
      charset: 'LATIN1_SWEDISH_CI'
    });

    assert.equal(config.charsetNumber, common.Charsets.LATIN1_SWEDISH_CI);
  },

  'accepts case-insensitive charset name': function() {
    var config = new ConnectionConfig({
      charset: 'big5_chinese_ci'
    });

    assert.equal(config.charsetNumber, common.Charsets.BIG5_CHINESE_CI);
  },

  'accepts short charset name': function() {
    var config = new ConnectionConfig({
      charset: 'UTF8MB4'
    });

    assert.equal(config.charsetNumber, common.Charsets.UTF8MB4_GENERAL_CI);
  },

  'throws on unknown charset': function() {
    var error;

    try {
      var config = new ConnectionConfig({
        charset: 'INVALID_CHARSET'
      });
    } catch (err) {
      error = err;
    }

    assert.ok(error);
    assert.equal(error.name, 'TypeError');
    assert.equal(error.message, 'Unknown charset \'INVALID_CHARSET\'');
  },

  'all charsets should have short name': function() {
    var charsets = Object.keys(common.Charsets);

    for (var i = 0; i < charsets.length; i++) {
      var charset = charsets[i];
      assert.ok(common.Charsets[charset]);
      assert.ok(common.Charsets[charset.split('_')[0]]);
    }
  }
});

test('ConnectionConfig#Constructor.connectTimeout', {
  'defaults to 10 seconds': function() {
    var config = new ConnectionConfig({});

    assert.equal(config.connectTimeout, (10 * 1000));
  },

  'undefined uses default': function() {
    var config = new ConnectionConfig({
      connectTimeout: undefined
    });

    assert.equal(config.connectTimeout, (10 * 1000));
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
  }
});

test('ConnectionConfig#Constructor.ssl', {
  'defaults to false': function() {
    var config = new ConnectionConfig({});

    assert.equal(config.ssl, false);
  },

  'string loads pre-defined profile': function() {
    var config = new ConnectionConfig({
      ssl: 'Amazon RDS'
    });

    assert.ok(config.ssl);
    assert.ok(/-----BEGIN CERTIFICATE-----/.test(config.ssl.ca));
  },

  'throws on unknown profile name': function() {
    var error;

    try {
      var config = new ConnectionConfig({
        ssl: 'invalid profile'
      });
    } catch (err) {
      error = err;
    }

    assert.ok(error);
    assert.equal(error.name, 'TypeError');
    assert.equal(error.message, 'Unknown SSL profile \'invalid profile\'');
  }
});

test('ConnectionConfig#mergeFlags', {
  'adds flag to empty list': function() {
    var initial  = '';
    var flags    = 'LONG_PASSWORD';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_LONG_PASSWORD);
  },

  'adds flag to list': function() {
    var initial  = ['LONG_PASSWORD', 'FOUND_ROWS'];
    var flags    = 'LONG_FLAG';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_LONG_PASSWORD
      | common.ClientConstants.CLIENT_FOUND_ROWS
      | common.ClientConstants.CLIENT_LONG_FLAG);
  },

  'adds unknown flag to list': function() {
    var initial  = ['LONG_PASSWORD', 'FOUND_ROWS'];
    var flags    = 'UNDEFINED_CONSTANT';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_LONG_PASSWORD
      | common.ClientConstants.CLIENT_FOUND_ROWS);
  },

  'removes flag from empty list': function() {
    var initial  = '';
    var flags    = '-LONG_PASSWORD';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, 0x0);
  },

  'removes existing flag from list': function() {
    var initial  = ['LONG_PASSWORD', 'FOUND_ROWS'];
    var flags    = '-LONG_PASSWORD';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_FOUND_ROWS);
  },

  'removes non-existing flag from list': function() {
    var initial  = ['LONG_PASSWORD', 'FOUND_ROWS'];
    var flags    = '-LONG_FLAG';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_LONG_PASSWORD
      | common.ClientConstants.CLIENT_FOUND_ROWS);
  },

  'removes unknown flag to list': function() {
    var initial  = ['LONG_PASSWORD', 'FOUND_ROWS'];
    var flags    = '-UNDEFINED_CONSTANT';
    var combined = ConnectionConfig.mergeFlags(initial, flags);

    assert.strictEqual(combined, common.ClientConstants.CLIENT_LONG_PASSWORD
      | common.ClientConstants.CLIENT_FOUND_ROWS);
  }
});

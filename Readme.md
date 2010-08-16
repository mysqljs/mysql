# node-mysql

## Purpose

A node.js module implementing the
[MySQL protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Design Goals

* Simplicity: The MySQL protocol is easy, a good parser should reflect that
* Efficiency: Use fast algorithms, buffers and as little memory as possible.
* Portability: Should run anywhere node runs
* Completeness: The goal is to support the full MySQL API.

## Tutorial

    var Client = new require('mysql').Client,
        client = new Client();

    client.user = 'root';
    client.password = 'root';

    client.connect();

    client.query('CREATE DATABASE '+TEST_CONFIG.database, function() {
      if (err && err.errorNumber != Client.ERROR_DB_CREATE_EXISTS) {
        throw err;
      }
    });

    // If no callback is provided, any errors will be emitted as `'error'`
    // events by the client
    client.query('USE '+TEST_CONFIG.database);

    client.query(
      'CREATE TEMPORARY TABLE '+TEST_TABLE+
      '(id INT(11) AUTO_INCREMENT, '+
      'title VARCHAR(255), '+
      'text TEXT, '+
      'created DATETIME, '+
      'PRIMARY KEY (id));',
    );

    client.query(
      'INSERT INTO '+TEST_TABLE+' '+
      'SET title = ?, text = ?, created = ?',
      ['super cool', 'this is a nice text', '2010-08-16 10:00:23'],
    );

    var query = client.query(
      'INSERT INTO '+TEST_TABLE+' '+
      'SET title = ?, text = ?, created = ?',
      ['another entry', 'because 2 entries make a better test', '2010-08-16 12:42:15']
    );

    client.query(
      'SELECT * FROM '+TEST_TABLE,
      gently.expect(function selectCb(err, results, fields) {
        if (err) {
          throw err;
        }

        console.log(results);
        console.log(fields);
        client.end();
      })
    );

## API

### new mysql.Client([options])

Creates a new client instance. Any client property can be set using the
`options array.

### client.host = 'localhost'

The host to connect to.

### client.port = 3306

The port to connect to.

### client.user = null

The username to authenticate as.

### client.password = null

The password to use.

### client.database = null

The name of the database to connect to (optional).

### client.flags = Client.defaultFlags

Connection flags send to the server.

## Todo

At this point this module is not ready for anything yet.

* Prepared Statements
* Test using no Password
* Charsets handling
* Import Error code constants
* ...

## License

node-mysql is licensed under the MIT license.

## Sponsors

* [Joyent](http://www.joyent.com/)

This is a big effort. If your company could benefit from a top-notch MySQL driver
for node, a small sponsorship payment would be greatly appreciated. Contact
me at [felix@debuggable.com](mailto:felix@debuggable.com) for details.

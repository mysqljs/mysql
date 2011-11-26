# node-mysql

[![Build Status](https://secure.travis-ci.org/felixge/node-mysql.png)](http://travis-ci.org/felixge/node-mysql)

## Purpose

A pure node.js JavaScript Client implementing the [MySQL protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Support this module

If you like this module, check out and spread the word about our service
[transloadit.com][]. We provide file uploading and encoding functionality to
other applications, and have performed billions of queries with this module so
far.

[transloadit.com]: http://transloadit.com/

## Installation

```
npm install mysql
```

**Important**: If you are upgrading from 0.9.1 or below, there have been
backwards incompatible changes in the API. Please read the [upgrading guide][].

[upgrading guide]: https://github.com/felixge/node-mysql/wiki/Upgrading-to-0.9.2+

## Usage

``` javascript
var mysql = require('mysql');
var TEST_DATABASE = 'nodejs_mysql_test';
var TEST_TABLE = 'test';
var client = mysql.createClient({
  user: 'root',
  password: 'root',
});

client.query('CREATE DATABASE '+TEST_DATABASE, function(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) {
    throw err;
  }
});

// If no callback is provided, any errors will be emitted as `'error'`
// events by the client
client.query('USE '+TEST_DATABASE);

client.query(
  'CREATE TEMPORARY TABLE '+TEST_TABLE+
  '(id INT(11) AUTO_INCREMENT, '+
  'title VARCHAR(255), '+
  'text TEXT, '+
  'created DATETIME, '+
  'PRIMARY KEY (id))'
);

client.query(
  'INSERT INTO '+TEST_TABLE+' '+
  'SET title = ?, text = ?, created = ?',
  ['super cool', 'this is a nice text', '2010-08-16 10:00:23']
);

var query = client.query(
  'INSERT INTO '+TEST_TABLE+' '+
  'SET title = ?, text = ?, created = ?',
  ['another entry', 'because 2 entries make a better test', '2010-08-16 12:42:15']
);

client.query(
  'SELECT * FROM '+TEST_TABLE,
  function selectCb(err, results, fields) {
    if (err) {
      throw err;
    }

    console.log(results);
    console.log(fields);
    client.end();
  }
);
```

## API

### mysql.createClient([options])

Creates a new client instance. Any client property can be set using the
`options` object.

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

### client.debug = false

Prints incoming and outgoing packets, useful for development / testing purposes.

### client.flags = Client.defaultFlags

Connection flags send to the server.

### client.query(sql, [params, cb])

Sends a `sql` query to the server. `'?'` characters can be used as placeholders
for an array of `params` that will be safely escaped before sending the final
query.

This method returns a `Query` object which can be used to stream incoming row
data.

**Warning:** `sql` statements with multiple queries separated by semicolons
are not supported yet.

### client.ping([cb])

Sends a ping command to the server.

### client.useDatabase(database, [cb])

Same as issuing a `'USE <database>'` query.

### client.statistics([cb])

Returns some server statistics provided by MySql.

### client.format(sql, params)

Allows to safely insert a list of `params` into a `sql` string using the
placeholder mechanism described above.

### client.escape(val)

Escapes a single `val` for use inside of a sql string.

### client.destroy()

Forces the client connection / socket to be destroyed right away.

### client.end([cb])

Schedule a COM_QUIT packet for closing the connection. All currently queued
queries will still execute before the graceful termination of the connection
is attempted.

### client event: 'error' (err)

When the client has no callback / delegate for an error, it is emitted with this
event instead.

### new mysql.Query()

Query objects are not meant to be invoked manually. To get a query object, use
the `client.query` API.

### query event: 'error' (err)

Emitted when mysql returns an error packet for the query.

### query event: 'field' (field)

Emitted upon receiving a field packet from mysql.

### query event: 'row' (row)

Emitted upon receiving a row. An option for streaming the contents of the row
itself will be made available soon.

### query event: 'end' ([result])

Emitted once the query is finished. In case there is no result set, a `result`
parameter is provided which contains the information from the mysql OK packet.

## FAQ

### How do I compile this module?

This module is written entirely in JavaScript. There is no dependency on external
C libraries such as libmysql. That means you don't have to compile this module
at all.

### How can I retrieve the id from the last inserted record?

    client.query('INSERT INTO my_table SET title = ?', function(err, info) {
      console.log(info.insertId);
    });

## Todo

At this point the module is ready to be tried out, but a lot of things are yet to be done:

* Implement retry
* Pause / resume
* Remaining mysql commands
* Prepared Statements
* Packet's > 16 MB
* Compression
* Decide how to handle queries with multiple statements

## Contributors

[Click here][contributors] for a full list of contributors.

[contributors]: https://github.com/felixge/node-mysql/contributors

## Sponsors

* [Joyent](http://www.joyent.com/) - Main sponsor, you should check out their [node.js hosting](https://no.de/).
* [pinkbike.com](http://pinkbike.com/) - The most awesome biking site there is

This is a rather large project requiring a significant amount of my limited resources.

If your company could benefit from a well-engineered non-blocking mysql driver, and
wants to support this project, I would greatly appriciate any sponsorship you may be
able to provide. All sponsors will get lifetime display in this readme, priority
support on problems, and votes on roadmap decisions. If you are interested, contact
me at [felix@debuggable.com](mailto:felix@debuggable.com) for details.

Of course I'm also happy about code contributions. If you're interested in
working on features, just get in touch so we can talk about API design and
testing.

[transloadit]: http://transloadit.com/

## Changelog

### v0.9.5

* Fix #142 Driver stalls upon reconnect attempt that's immediately closed
* Add travis build
* Switch to urun as a test runner
* Switch to utest for unit tests
* Remove fast-or-slow dependency for tests
* Split integration tests into individual files again

### v0.9.4

* Expose package.json as `mysql.PACKAGE` (#104)

### v0.9.3

* Set default `client.user` to root
* Fix #91: Client#format should not mutate params array
* Fix #94: TypeError in client.js
* Parse decimals as string (vadimg)

### v0.9.2

* The underlaying socket connection is now managed implicitly rather than explicitly.
* Check the [upgrading guide][] for a full list of changes.

### v0.9.1

* Fix issue #49 / `client.escape()` throwing exceptions on objects. (Nick Payne)
* Drop < v0.4.x compatibility. From now on you need node v0.4.x to use this module.

### Older releases

These releases were done before starting to maintain the above Changelog:

* [v0.9.0](https://github.com/felixge/node-mysql/compare/v0.8.0...v0.9.0)
* [v0.8.0](https://github.com/felixge/node-mysql/compare/v0.7.0...v0.8.0)
* [v0.7.0](https://github.com/felixge/node-mysql/compare/v0.6.0...v0.7.0)
* [v0.6.0](https://github.com/felixge/node-mysql/compare/v0.5.0...v0.6.0)
* [v0.5.0](https://github.com/felixge/node-mysql/compare/v0.4.0...v0.5.0)
* [v0.4.0](https://github.com/felixge/node-mysql/compare/v0.3.0...v0.4.0)
* [v0.3.0](https://github.com/felixge/node-mysql/compare/v0.2.0...v0.3.0)
* [v0.2.0](https://github.com/felixge/node-mysql/compare/v0.1.0...v0.2.0)
* [v0.1.0](https://github.com/felixge/node-mysql/commits/v0.1.0)

## License

node-mysql is licensed under the MIT license.

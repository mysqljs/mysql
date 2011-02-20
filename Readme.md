# node-mysql

## Purpose

A pure node.js JavaScript Client implementing the [MySQL protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Current status

This module was developed for [Transloadit](http://transloadit.com/), a service focused on uploading
and encoding images and videos. It is currently used in production there, but since the service is not
very heavy on database interaction your milage may vary.

## Contributors

* Felix Geisendörfer ([felixge](http://github.com/felixge/node-mysql/commits/master?author=felixge)) - Author and maintainer
* Bert Belder ([piscisaureus](http://github.com/felixge/node-mysql/commits/master?author=piscisaureus))
* Alan Gutierrez ([bigeasy](http://github.com/felixge/node-mysql/commits/master?author=bigeasy))
* Brian ([mscdex](http://github.com/felixge/node-mysql/commits/master?author=mscdex))
* Cal Henderson ([iamcal](http://github.com/felixge/node-mysql/commits/master?author=iamcal))
* Frank Grimm ([FrankGrimm](http://github.com/felixge/node-mysql/commits/master?author=FrankGrimm))
* Nick Payne ([makeusabrew](http://github.com/felixge/node-mysql/commits/master?author=makeusabrew))

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

## Installation

    npm install mysql

Or if you don't want to use npm / run the latest source:

    cd ~/.node_libraries
    git clone git://github.com/felixge/node-mysql.git mysql

## Compatibility

This module is compatible with node v0.4.x.

If you need to work with an older node version, download v0.9.0. It supports
node >= v0.1.102.

## Design Goals

* TDD: All code is written using test driven development, code coverage should approach 100%
* Simplicity: The MySQL protocol is easy, a good parser should reflect that
* Efficiency: Use fast algorithms, buffers and as little memory as possible.
* Portability: Should run anywhere node runs
* Completeness: The goal is to support the full MySQL API.
* Compatibility: MySql >= 4.1

## Tutorial

    var Client = require('mysql').Client,
        client = new Client(),
        TEST_DATABASE = 'nodejs_mysl_test',
        TEST_TABLE = 'test';

    client.user = 'root';
    client.password = 'root';

    client.connect();

    client.query('CREATE DATABASE '+TEST_DATABASE, function(err) {
      if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
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

## API

### new mysql.Client([options])

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

### client.connect([cb])

Initiates a connection to the specified host server.

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

### client.destroy([cb])

Forces the client connection to be destroyed right away. This is not a
nice way to terminate the connection, use with caution.

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

* Pause / resume
* Remaining mysql commands
* Prepared Statements
* Packet's > 16 MB
* Compression
* Performance profiling
* Handle re-connect after bad credential error (should query queue be kept?)
* Deal with stale connections / other potential network issues
* Decide how to handle queries with multiple statements

## Changelog

### v0.9.1

* Fix issue #49 / `client.escape()` throwing exceptions on objects. (Nick Payne)
* Drop < v0.4.x compatibility. From now on you need node v0.4.x to use this module.

[See Commits](https://github.com/felixge/node-formidable/compare/v0.9.0...v0.9.1)

### Older releases

These releases were done before starting to maintain the above Changelog:

* [v0.9.0](https://github.com/felixge/node-formidable/compare/v0.8.0...v0.9.0)
* [v0.8.0](https://github.com/felixge/node-formidable/compare/v0.7.0...v0.9.0)
* [v0.7.0](https://github.com/felixge/node-formidable/compare/v0.6.0...v0.9.0)
* [v0.6.0](https://github.com/felixge/node-formidable/compare/v0.5.0...v0.9.0)
* [v0.5.0](https://github.com/felixge/node-formidable/compare/v0.4.0...v0.9.0)
* [v0.4.0](https://github.com/felixge/node-formidable/compare/v0.3.0...v0.9.0)
* [v0.3.0](https://github.com/felixge/node-formidable/compare/v0.2.0...v0.9.0)
* [v0.2.0](https://github.com/felixge/node-formidable/compare/v0.1.0...v0.9.0)
* [v0.1.0](https://github.com/felixge/node-formidable/commits/v0.1.0)

## License

node-mysql is licensed under the MIT license.

# node-mysql

## Purpose

A node.js module implementing the
[MySQL protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Contributors

* Bert Belder ([piscisaureus](http://github.com/felixge/node-mysql/commits/master?author=piscisaureus))
* Alan Gutierrez ([bigeasy](http://github.com/felixge/node-mysql/commits/master?author=bigeasy))
* Brian ([mscdex](http://github.com/felixge/node-mysql/commits/master?author=mscdex))
* Cal Henderson ([iamcal](http://github.com/felixge/node-mysql/commits/master?author=iamcal))

## Sponsors

* [Joyent](http://www.joyent.com/)
* [pinkbike.com](http://pinkbike.com/)

I'm working on this driver because I need it for my own startup
([transloadit.com][transloadit]), but it's a big project (~100-200 hours) with
obvious benefits to other companies who are using MySql.

So if your company could benefit from a well-engineered node.js mysql driver,
I would greatly appriciate any sponsorship you may be able to provide. All
sponsors will get lifetime display in this readme, priority support on problems,
and votes on roadmap decisions. If you are interested, contact me at
[felix@debuggable.com](mailto:felix@debuggable.com) for details.

Of course I'm also happy about code contributions. If you're interested in
working on features, just get in touch so we can talk about API design and
testing.

[transloadit]: http://transloadit.com/

## Installation

    npm install mysql

## Design Goals

* TDD: All code is written using test driven development, code coverage should approach 100%
* Simplicity: The MySQL protocol is easy, a good parser should reflect that
* Efficiency: Use fast algorithms, buffers and as little memory as possible.
* Portability: Should run anywhere node runs
* Completeness: The goal is to support the full MySQL API.
* Compatibility: MySql >= 4.1

## Tutorial

    var Client = require('mysql').Client,
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

### client.format(sql, params)

Allows to safely insert a list of `params` into a `sql` string using the
placeholder mechanism described above.

### client.escape(val)

Escapes a single `val` for use inside of a sql string.

### client.end([cb])

Closes the connection to the server.

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

## Todo

At this point the module is ready to be tried out, but a lot of things are yet to be done:

* Handle timeouts / reconnect
* Pause / resume
* Remaining mysql commands
* Prepared Statements
* Packet's > 16 MB
* Compression
* Performance profiling
* ?

## License

node-mysql is licensed under the MIT license.

# node-mysql

[![Build Status](https://secure.travis-ci.org/felixge/node-mysql.png?branch=v2.0)](http://travis-ci.org/felixge/node-mysql)

## Introduction

This is a node.js driver for mysql. It is written in JavaScript, does not
require compiling, and is 100% MIT licensed.

Here is an example on how to use it:

```js
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'me',
  password : 'secret',
});

connection.connect();

connection.query('SELECT 1', function(err, rows) {
  if (err) throw err;

  console.log('Query result: ', rows);
});

connection.end();
```

From this example, you can learn the following:

* Every method you invoke on a connection is queued and executed in sequence.
* Closing the connection is done using `end()` which makes sure all remaining
  queries are executed before sending a quit packet to the mysql server.

## Contributors

A lot of people have helped improving this module, see the
[GitHub Contributors page][]. Thank you!

[GitHub Contributors page]: https://github.com/felixge/node-mysql/graphs/contributors

## Sponsors

The following companies have supported this project financially, allowing me to
spend more time on it (ordered by time of contribution):

* [Joyent](http://www.joyent.com/)
* [pinkbike.com](http://pinkbike.com/)
* [Holiday Extras Ltd](http://www.holidayextras.co.uk/)
* [newscope](http://newscope.com/)

If you are interested in sponsoring a day or more of my time, please
[get in touch][].

[get in touch]: http://felixge.de/consulting

## Establishing connections

The recommended way to establish a connection is this:

```js
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : String, // defaults to 'localhost'
  port     : Number, // defaults to 3306
  user     : String, // defaults to undefined
  password : String, // defaults to undefined
  database : String, // defaults to undefined
  typeCast : Boolean, // defaults to true
  debug    : Boolean, // defaults to false
});

connection.connect(function(err) {
  // connected! (unless `err` is set)
});
```

However, a connection can also be implicitly established by invoking a query:

```js
var mysql      = require('mysql');
var connection = mysql.createConnection(...);

connection.query('SELECT 1', function(err, rows) {
  // connected! (unless `err` is set)
});
```

Depending on how you like to handle your errors, either method may be
appropriate. Any type of connection error (handshake or network) is considered
a fatal error, see the [Error Handling](#error-handling) section for more
information.

## Terminating connections

There are two ways to end a connection. Terminating a connection gracefully is
done by calling the `end()` method:

```js
connection.end(function(err) {
  // The connection is terminated now
});
```

This will make sure all previously enqueued queries are still before sending a
`COM_QUIT` packet to the MySQL server. If a fatal error occurs before the
`COM_QUIT` packet can be sent, an `err` argument will be provided to the
callback, but the connection will be terminated regardless of that.

An alternative way to end the connection is to call the `destroy()` method.
This will cause an immediate termination of the underlaying socket.
Additionally `destroy()` guarantees that no more events or callbacks will be
triggered for the connection.

```js
connection.destroy();
```

Unlike `end()` the `destroy()` method does not take a callback argument.

## Escaping Query Values

In order to avoid SQL Injection attacks, you should always escape any user
provided data before using it inside a SQL query. You can do so using the
`connection.escape()` method:

```js
var userId = 'some user provided value';
var sql    = 'SELECT * FROM users WHERE id = ' + connection.escape(userId);
connection.query(sql, function(err, results) {
  // ...
});
```

Alternatively, you can use `?` characters as placeholders for values you would
like to have escaped like this:

```js
connection.query('SELECT * FROM users WHERE id = ?', [userId], function(err, results) {
  // ...
});
```

This looks similar to prepared statements in MySQL, however it really just uses
the same `connection.escape` method internally.

Different value types are escaped differently, here is how:

* Numbers are left untouched
* Booleans are converted to `true` / `false` strings
* Date objects are converted to `'YYYY-mm-dd HH:ii:ss'` strings
* Buffers are converted to hex strings, e.g. `X'0fa5'`
* Strings are safely escaped
* Arrays are turned into list, e.g. ['a', 'b'] turns into `'a', 'b'`
* Objects are turned into `key = 'val'` pairs. Nested objects are cast to
  strings.
* `undefined` / `null` are converted to `NULL`

If you paid attention, you may have noticed that this escaping allows you
to do neat things like this:

```js
var post  = {id: 1, title: 'Hello MySQL'};
var query = connection.query('INSERT INTO posts SET ?', post, function(err, result) {
  // Neat!
});
console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'

```

## Executing Queries in Parallel

The MySQL protocol is sequential, this means that you need multiple connections
to execute queries in parallel. Future version of this module may ship with a
connection pool implementation, but for now you have to figure out how to
manage multiple connections yourself if you want to execute queries in
parallel.

One simple approach is to create one connection per incoming http request.

## Streaming Query Rows

Sometimes you may want to select large quantities of rows and process each of
them as they are received. This can be done like this:

```js
var query = connection.query('SELECT * FROM posts');
query
  .on('error', function(err) {
    // Handle error, an 'end' event will be emitted after this as well
  })
  .on('row', function(row) {
    // Pausing the connnection is useful if your processing involves I/O
    connection.pause();

    processRow(row, function() {
      connection.resume();
    });
  })
  .on('end', function() {
    // all rows have been received
  });
```

Please note a few things about the example above:

* Usually you will want to receive a certain amount of rows before starting to
  throttle the connection using `pause()`. This number will depend on the
  amount and size of your rows.
* `pause()` / `resume()` operate on the underlaying socket and parser. You are
  guaranteed that no more `'row'` events will fire after calling `pause()`.
* You MUST NOT provide a callback to the `query()` method when streaming rows.
  If you do so, all rows will be buffered for you, and you will not receive
  `'row'` events on the query object.

Additionally you may be interested to know that it is currently not possible to
stream individual row columns, they will always be buffered up entirely. If you
have a good use case for streaming large fields to and from MySQL, I'd love to
get your thoughts and conributions on this.

## Error Handling

This module comes with a consistent approach to error handling that you should
review carefully in order to write solid applications.

All errors created by this module are instances of the JavaScript [Error][]
object. Additionally they come with two properties:

* `err.code`: Either a [MySQL server error][] (e.g.
  `'ER_ACCESS_DENIED_ERROR'`), a node.js error (e.g. `'ECONNREFUSED'`) or an
  internal error (e.g.  `'PROTOCOL_PARSER_EXCEPTION'`).
* `err.fatal`: Boolean, indicating if this error is terminal to the connection
  object.

[Error]: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
[MySQL server error]: http://dev.mysql.com/doc/refman/5.5/en/error-messages-server.html

Fatal errors are propagated to *all* pending callbacks. In the example below, a
fatal error is triggered by trying to connect to an invalid port. Therefore the
error object is propagated to both pending callbacks:

```js
var connection = require('mysql').createConnection({
  port: 84943, // WRONG PORT
});

connection.connect(function(err) {
  console.log(err.code); // 'ECONNREFUSED'
  console.log(err.fatal); // true
});

connection.query('SELECT 1', function(err) {
  console.log(err.code); // 'ECONNREFUSED'
  console.log(err.fatal); // true
});
```

Normal errors however are only delegated to the callback they belong to.  So in
the example below, only the first callback receives an error, the second query
works as expected:

```js
connection.query('USE name_of_db_that_does_not_exist', function(err, rows) {
  console.log(err.code); // 'ER_BAD_DB_ERROR'
});

connection.query('SELECT 1', function(err, rows) {
  console.log(err); // null
  console.log(rows.length); // 1
});
```

Last but not least: If a fatal errors occurs and there are no pending
callbacks, or a normal error occurs which has no callback belonging to it, the
error is emitted as an `'error'` event on the connection object. This is
demonstrated in the example below:

```js
connection.on('error', function(err) {
  console.log(err.code); // 'ER_BAD_DB_ERROR'
});

connection.query('USE name_of_db_that_does_not_exist');
```

Note: `'error'` are special in node. If they occur without an attached
listener, a stack trace is printed and your process is killed.

**tl;dr:** This module does not want you to to deal with silent failures. You
should always provide callbacks to your method calls. If you want to ignore
this advice and suppress unhandled errors, you can do this:

```js
// I am Chuck Noris:
connection.on('error', function() {});
```

### Type Casting

For your convenience, this driver will cast mysql types into native JavaScript
types by default. The following mappings exist:

#### Number

* TINYINT
* SMALLINT
* INT
* MEDIUMINT
* YEAR
* FLOAT
* DOUBLE

#### Date

* TIMESTAMP
* DATE
* DATETIME

#### Buffer

* TINYBLOB
* MEDIUMBLOB
* LONGBLOB
* BLOB
* BINARY
* VARBINARY
* BIT

#### String

* CHAR
* VARCHAR
* TINYTEXT
* MEDIUMTEXT
* LONGTEXT
* TEXT
* ENUM
* SET
* DECIMAL (may exceed float precision)
* BIGINT (may exceed float precision)
* TIME (could be mapped to Date, but what date would be set?)
* GEOMETRY (never used those, get in touch if you do)

It is not recommended (and may go away / change in the future) to disable type
casting, but you can currently do so on either the connection:

```js
var connection = require('mysql').createConnection({typeCast: false});
```

Or on the query level:

```js
var query = connection.query('...'):
query.typeCast = false;
```

## Debugging and Reporting Problems

If you are running into problems, one thing that may help is enabling the
`debug` mode for the connection:

```js
var connection = mysql.createConnection({debug: true});
```

This will print all incoming and outgoing packets on stdout.

If that does not help, feel free to open a GitHub issue. A good GitHub issue
will have:

* The minimal amount of code required to reproduce the problem (if possible)
* As much debugging output and information about your environment (mysql
  version, node version, os, etc.) as you can gather.

## FAQ

I have yet to write this, but it will include:

* What benefits does this driver have over compiled alternatives? (portability,
  license, docs)
* How is the performance of this module compared to the alternatives? (great)
* Is there commercial support for this driver? (nodefirm?)
* What features are missing? (stored procedures, transactions, pause, etc.)
* How can I contribute? (explain)
* What are the goals of this project?

## Todo

* Stored procedures (should work somewhat, but needs multi result queries and
  tests)
* Transactions (should work, needs testing)
* Prepared statements
* Packets > 16 MB
* Multi result queries
* pause() / resume()
* setTimeout() for Connection / Query
* connection pooling

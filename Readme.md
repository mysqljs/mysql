# node-mysql

## Introduction

This is a node.js driver for mysql. Unlike other modules, it is written
entirely in JavaScript, and does not require any compiling.

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
* You have to explicitly call the `connect()` method in the beginning.
* Closing the connection is done using `end()` which makes sure all remaining
  queries are executed before sending a quit packet to the mysql server.

## Handling Errors

This module comes with a consistent approach to error handling that you should
review carefully in order to write solid applications.

All errors created by this module are instances of the JavaScript [Error][]
object. Additionally they come with two properties:

* `err.code`: Either a [MySQL server error][] (e.g. `ER_ACCESS_DENIED_ERROR`),
  a node.js error (e.g. `ECONNREFUSED`) or an internal error (e.g.
  `PARSER_ERROR`).
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
  console.log(err.code); // ECONNREFUSED
});

connection.query('SELECT 1', function(err) {
  console.log(err.code); // ECONNREFUSED
});
```

Normal errors however are only delegated to the callback they belong to.  So in
the example below, only one the first callback receives an error, the second
query works as expected:

```js
connection.query('USE name_of_db_that_does_not_exist', function(err, rows) {
  console.log(err.code); // ER_BAD_DB_ERROR
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
  console.log(err.code); // ER_BAD_DB_ERROR
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

## FAQ

I have yet to write this, but it will include:

* What benefits does this driver have over compiled alternatives? (portability,
  license, docs)
* How is the performance of this module compared to the alternatives? (great)
* Is there commercial support for this driver? (nodefirm?)
* What features are missing? (stored procedures, transactions, etc.)
* How can I contribute? (explain)

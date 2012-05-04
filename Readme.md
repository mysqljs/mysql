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
* Closing the connection is generally done using `end()` which makes sure all
  remaining queries are executed before sending a quit packet to the mysql
  server.

## Handling Errors

This module comes with a consistent approach to error handling that you should
review carefully in order to write solid applications.

First you need to know that there are two kinds of errors which behave
differently:

* **Fatal Errors**: Any error that renders the connection unusable.
* **Normal Errors**: Any other error.


### MySQL error codes


```js
var connection = require('mysql').createConnection({
  host     : 'localhost',
  user     : 'USER',
  password : 'WRONG PASSWORD',
});

connection.connect(function(err) {
  console.log(err.message); // Access denied for user 'USER'@'localhost' (using password: YES)
  console.log(err.code); // ER_ACCESS_DENIED_ERROR
});

connection.query(function(err) {

});
```

From the example above you can learn:

* Errors are delegated to the callback 

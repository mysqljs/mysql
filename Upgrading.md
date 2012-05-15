# Upgrading from v0.9.x to v2.0

The first thing you will run into is that the old `Client` class is gone and
has been replaced with a less ambitious `Connection` class. So instead of
`mysql.createClient()`, you now have to:

```js
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'me',
  password : 'secret',
});

connection.query('SELECT 1', function(err, rows) {
  if (err) throw err;

  console.log('Query result: ', rows);
});

connection.end();
```

The new `Connection` class does not try to handle re-connects, please study the
`Server disconnects` section in the new Readme.

Other than that, the interface has stayed very similar. Here are a few things
to check out so:

* BIGINT's are now cast into strings
* Binary data is now cast to buffers
* The `'row'` event on the `Query` object is now called `'result'` and will
  also be emitted for queries that produce an OK/Error response.
* Error handling is consistently defined now, check the Readme
* Escaping has become more powerful which may break your code if you are
  currently using objects to fill query placeholders.
* Connections can now be established explicitly again, so you may wish to do so
  if you want to handle connection errors specifically.

That should be most of it, if you run into anything else, please send a patch
or open an issue to improve this document.

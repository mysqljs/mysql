## User Plugins

### How to create your plugin?

Just create a module and load it with `.use()`.

```js
var mysql = require('mysql');
var myModule = require('./my-module');
var connection = mysql.createConnection('...');

connection.use(myModule);
```

### What should I export?

You must export a function. That function will be called with the `Connection` as first and only argument.

```js
exports = function (Connection) {
  // my amazing plugin
  Connection.foo = function () {
    return 'bar';
  };
};
```

### What if I want to be able to add some settings?

Simple! Just export a function that accepts your settings and that returns the function described above.

```js
exports = function (opts) {
  opts || opts = {};

  return function (Connection) {
    // my amazing plugin
    Connection.foo = function () {
      return opts.bar || 'bar';
    };
  };
};
```

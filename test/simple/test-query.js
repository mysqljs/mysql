require('../common');
var Query = require('mysql/query'),
    EventEmitter = require('events').EventEmitter,
    query,
    gently;

function test(test) {
  query = new Query();
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.ok(query instanceof EventEmitter);
});

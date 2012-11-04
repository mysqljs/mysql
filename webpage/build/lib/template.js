var handlebars = require('handlebars');
var fs         = require('fs');

handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
  if (arguments.length < 3)
    throw new Error("Handlebars Helper equal needs 2 parameters");
  if( lvalue!=rvalue ) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

exports.load = function (path) {
  return handlebars.compile(fs.readFileSync(path).toString());
};

var SRC_PATH   = '../src/';
var OUT_PATH   = './out/';

var pages      = require('./lib/pages').get(SRC_PATH + 'pages/');
var index_tpl  = require('./lib/template').load(SRC_PATH + 'index_template.hb');
var page_tpl   = require('./lib/template').load(SRC_PATH + 'page_template.hb');

for (var i = 0; i < pages.length; i++) {
  require('./lib/pages').build(pages[i], pages, (i === 0) ? index_tpl : page_tpl, OUT_PATH);
}

require('./lib/stylesheet').build(SRC_PATH + 'assets/screen.styl', OUT_PATH + 'assets/screen.css');
require('./lib/assets').copy(SRC_PATH + 'assets/', OUT_PATH + 'assets/');

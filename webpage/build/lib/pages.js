var jsdom  = require('jsdom');
var md     = require('markdown');
var hl     = require('highlight').Highlight;
var fs     = require('fs');

exports.get = function (path) {
  var files = fs.readdirSync(path);
  var pages = [], data, link, m;

  for (var i = 0; i < files.length; i++) {
    m = files[i].match(/^(\d+)\.\s+(.+)\.md/);
    if (m === null) continue;

    data = md.markdown.toHTML(fs.readFileSync(path + files[i]).toString());

    if (m[1] == '0') {
      link = 'index.html';
    } else {
      link = m[2].toLowerCase() + '.html';
    }

    pages[Number(m[1])] = {
      title  : m[2],
      link   : link,
      content: data
    };
  }

  return pages;
};

exports.build = function (page, pages, template, out_path) {
  page.selected = true;

  var output = template({
    page : page,
    pages: pages
  });

  page.selected = false;

  jsdom.env(
    output,
    ["http://code.jquery.com/jquery.js"],
    function (errors, window) {
      var $ = window.$;

      $("code").each(function (i, el) {
        var data = hl($(el).html()).replace(/&amp;/g, '&');
        $(el).html(data);
      });

      fs.writeFileSync(out_path + page.link, window.document.innerHTML);

      window.close();
    }
  );
};

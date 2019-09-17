var fs   = require('fs');
var path = require('path');
var util = require('util');

var MARKDOWN_SECTION_REGEXP = /^(#+) (.+)$/;
var NEWLINE_REGEXP          = /\r?\n/;
var README_PATH             = path.join(__dirname, '..', 'Readme.md');
var README_CONTENTS         = fs.readFileSync(README_PATH, 'utf-8');
var TOC_SECTION_NAME        = 'Table of Contents';

var currentSectionLevel = null;
var currentSectionName  = null;
var currentToc          = [];
var expectedToc         = [];
var tocOffset           = 0;

README_CONTENTS.split(NEWLINE_REGEXP).forEach(function (line, index) {
  var match = MARKDOWN_SECTION_REGEXP.exec(line);

  if (match) {
    currentSectionLevel = match[1].length;
    currentSectionName  = match[2];

    if (currentSectionName === TOC_SECTION_NAME) {
      tocOffset = index;
    }

    if (currentSectionLevel > 1 && currentSectionName !== TOC_SECTION_NAME) {
      expectedToc.push(util.format('%s- [%s](%s)',
        repeat('  ', (currentSectionLevel - 2)), currentSectionName, toAnchor(currentSectionName)));
    }
  } else if (currentSectionName === TOC_SECTION_NAME) {
    currentToc.push(line);
  }
});

var index = 0;

if (currentToc[index++].length !== 0) {
  expect((tocOffset + index), 'blank line', currentToc[index - 1]);
}

expectedToc.forEach(function (expectedLine) {
  var currentLine = currentToc[index++] || '';

  if (expectedLine !== currentLine) {
    var currentIndex = currentToc.indexOf(expectedLine);

    expect((tocOffset + index), ('"' + expectedLine + '"'), currentLine);

    if (currentIndex !== -1) {
      index = currentIndex + 1;
    }
  }
});

function expect (lineidx, message, line) {
  console.log('Expected %s on line %d', message, (lineidx + 1));
  console.log('  Got: %s', line);
  process.exitCode = 1;
}

function  repeat (str, num) {
  var s = '';

  for (var i = 0; i < num; i++) {
    s += str;
  }

  return s;
}

function toAnchor (section) {
  return '#' + section.toLowerCase().replace(/ /g, '-');
}

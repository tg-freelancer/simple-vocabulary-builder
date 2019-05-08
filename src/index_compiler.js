const $ = require('jquery');
const Handlebars = require('handlebars')
const precompiler = require('./precompiler');

const indexContext = { contents: $('#index').html() };
const indexHtml = precompiler.tmplScript(indexContext);

$('.container').remove();
$(indexHtml).insertAfter($('aside'));
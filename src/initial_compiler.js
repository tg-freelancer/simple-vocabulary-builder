const $ = require('jquery');
const Handlebars = require('handlebars')
const tmpl = $('#container').html();
const tmplScript = Handlebars.compile(tmpl);
const indexContext = { contents: $('#index').html() };
const indexHtml =tmplScript(indexContext);

$(indexHtml).insertAfter($('aside'));
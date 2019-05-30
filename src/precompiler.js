const $ = require('jquery');
const Handlebars = require('handlebars');
const tmpl = $('#template_container').html();
module.exports.tmplScript = Handlebars.compile(tmpl);

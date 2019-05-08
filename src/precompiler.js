const $ = require('jquery');
const Handlebars = require('handlebars');
const tmpl = $('#container').html();
module.exports.tmplScript = Handlebars.compile(tmpl);

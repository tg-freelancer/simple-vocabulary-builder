const $ = require('jquery');
const Handlebars = require('handlebars');
const Store = require('electron-store');
const store = new Store();
const tmpl = $('#template_container').html();
// store.set('indexHtml', $('main').html());
module.exports.tmplScript = Handlebars.compile(tmpl);

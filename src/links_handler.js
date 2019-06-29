const $ = require('jquery');
const Handlebars = require('handlebars');
const preprocess = require('./preprocess');
const os = require('os');
const Store = require('electron-store');
const store = new Store();

$('aside a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  const linkType = $link.attr('class');
  const newContext = { contents: $(`#${linkType}`).html() };
  let newContents = preprocess.tmplScript(newContext);

  if (linkType === 'index') {
    newContents = store.get('indexHtml');
    $('.contents').replaceWith(newContents);
  } else {
    if (linkType === 'stats') {
      if (os.platform() !== 'darwin') {
        $('.score_info').remove();
      }

      const statsTmplScript = Handlebars.compile(newContents);
      const words = store.get('words');
      newContents = statsTmplScript({ words: words }); 
    }
    
    $('.contents').replaceWith(newContents);
  }
})
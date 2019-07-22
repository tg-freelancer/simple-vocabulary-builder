const $ = require('jquery');
const Handlebars = require('handlebars');
const preprocess = require('./preprocess');
const os = require('os');
const dictHelpers = require('./dictionary');
const Store = require('electron-store');
const store = new Store();

// add the 'active' class to the list menu for the index page
$('.index').closest('li').addClass('active');

$('aside a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  const linkType = $link.attr('class');
  const newContext = { contents: $(`#${linkType}`).html() };
  let newContents = preprocess.tmplScript(newContext);

  // remove the "active" class
  // from the previously clicked li element
  $('aside li').removeClass('active');
  // add the "active" class to the clicked li element
  $(evt.target).closest('li').addClass('active');

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
      
      $('.contents').replaceWith(newContents);

      // displays the number of words
      const wordCount = dictHelpers.getWordCount(store.get('words'));
      $('.word_count').text(wordCount);
    } else {
      // linkType !== stats/index
      $('.contents').replaceWith(newContents);
    }
    // // create space for the title bar
    // $('.contents').addClass('title-bar-space');
  }
})
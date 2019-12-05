const $ = require('jquery');
const Handlebars = require('handlebars');
const preprocess = require('./preprocess');
const os = require('os');
const dictHelpers = require('./dictionary');
const Store = require('electron-store');
const store = new Store();

// add the 'active' class to the list menu for the index page
$('.index').closest('li').addClass('active');

$('aside li').on('click', (evt) => {
  evt.preventDefault();
  // const $e = $(evt.target);
  let $link = $(evt.target);

  if ($link.is('li')) {
    // the clicked element is not an anchor element (li element).
    // Sets it to its child anchor element
    $link = $link.find('a');
  }

  const linkType = $link.attr('class');
  const newContext = { contents: $(`#${linkType}`).html() };
  let newContents = preprocess.tmplScript(newContext);

  // // identify the previous page and store its html if it was the index page
  // const previousPageType = $('aside li').filter('.active').find('a').attr('class')
  // if (previousPageType === 'index') {
  //   store.set('indexHtml', $('main').html());
  // }

  // remove the "active" class from the previously clicked li element
  $('aside li').removeClass('active');

  // add the "active" class to the clicked li element
  $link.closest('li').addClass('active');

  if (linkType === 'index') {
    newContents = store.get('indexHtml');
    $('.contents').replaceWith(newContents);
    $.ajax({
      url: './renderer.js',
      dataType: "script",
      success: () => console.log('loaded')
    });
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
});
const $ = require('jquery');
const Handlebars = require('handlebars');
const precompiler = require('./precompiler');

$('aside a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  const linkType = $link.attr('class');

  let newContext;
  let newContents;

  // if (linkType === 'about') {
  newContext = { contents: $(`#${linkType}`).html() };
  // } 

  newContents = precompiler.tmplScript(newContext);
  $('.contents').replaceWith(newContents);
})
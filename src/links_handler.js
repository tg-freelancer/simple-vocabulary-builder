const $ = require('jquery');
const Handlebars = require('handlebars');

$('a').on('click', (evt) => {
  evt.preventDefault();
  const $link = $(evt.target);
  console.log($link.attr('class'));
})
console.log('inside sw.js');

self.addEventListener('activate', (evt) => {
  console.log('ready to handle fetches');
})

self.registration.showNotification('New message from Alice', {
    body: 'Hello world',
    actions: [
      {action: 'like', title: 'Like'},
      {action: 'reply', title: 'Reply'}
    ]
});
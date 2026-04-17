const fetch = require('node-fetch'); // wait, node 18 has fetch globally.

const urls = [
  'https://en.wikipedia.org/wiki/Screwdriver',
  'https://en.wikipedia.org/wiki/Tape_measure',
  'https://en.wikipedia.org/wiki/Hammer',
  'https://en.wikipedia.org/wiki/Pliers'
];

Promise.all(urls.map(u => fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Master.tj/1.0' } }).then(r => r.text()))).then(texts => {
  texts.forEach((text, i) => {
    const match = text.match(/<meta property="og:image" content="([^"]+)"/);
    if (match) console.log(urls[i], match[1]);
  });
}).catch(console.error);

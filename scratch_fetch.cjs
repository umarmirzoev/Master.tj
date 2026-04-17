const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'images', 'appliances');

async function run() {
  // Try Pixabay API (free, no key needed for small requests)
  const sources = [
    'https://cdn.pixabay.com/photo/2016/11/18/17/46/oven-1835498_640.jpg',
    'https://cdn.pixabay.com/photo/2017/08/07/22/02/kitchen-2608693_640.jpg',
    'https://cdn.pixabay.com/photo/2014/09/17/20/26/oven-450775_640.jpg',
  ];
  
  for (const url of sources) {
    try {
      console.log('Trying: ' + url);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Master.tj/1.0' } });
      if (!res.ok) { console.log('HTTP ' + res.status); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(dir, 'oven.jpg'), buf);
      console.log('SAVED oven.jpg (' + buf.length + ' bytes)');
      return;
    } catch(e) {
      console.log('ERROR: ' + e.message);
    }
  }
  console.log('ALL FAILED');
}
run();

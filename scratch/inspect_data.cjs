
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim().replace(/^"(.*)"$/, '$1'))));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cats } = await supabase.from('service_categories').select('id, name_ru').limit(3);
  console.log('Categories:', JSON.stringify(cats, null, 2));

  const { data: masters } = await supabase.from('master_listings').select('id, full_name, service_categories').limit(3);
  console.log('Masters:', JSON.stringify(masters, null, 2));
}

run();

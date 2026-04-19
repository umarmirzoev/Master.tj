
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: categories } = await supabase.from('service_categories').select('*');
  console.log('Categories:', categories?.length);
  if (categories) console.log('Sample Category:', categories[0]);

  const { data: services } = await supabase.from('services').select('*').limit(5);
  console.log('Services:', services?.length);
  if (services) console.log('Sample Service:', services[0]);

  const { data: masters } = await supabase.from('master_listings').select('*').limit(5);
  console.log('Masters:', masters?.length);
  if (masters) console.log('Sample Master Categories:', masters[0]?.service_categories);
}

checkData();

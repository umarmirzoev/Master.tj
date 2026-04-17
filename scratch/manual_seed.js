import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Read .env manually
const envFile = fs.readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log('Seeding demo data...')
  
  // 1. Create a few profiles
  const demoUsers = [
    { full_name: 'Иван Иванов', phone: '+992 900 11 22 33' },
    { full_name: 'Мария Сидорова', phone: '+992 918 44 55 66' },
    { full_name: 'Алишер Назаров', phone: '+992 927 77 88 99' }
  ]
  
  for (const user of demoUsers) {
    const { data, error } = await supabase.from('profiles').insert(user).select()
    if (error) console.error('Error inserting profile:', error.message)
    else console.log('Inserted profile:', data[0].full_name)
  }
  
  // 2. Add masters
  const { data: profs } = await supabase.from('profiles').select('id, full_name, phone').limit(3)
  if (profs) {
    for (const p of profs) {
       await supabase.from('user_roles').insert({ user_id: p.id, role: 'master' })
       await supabase.from('master_listings').insert({ 
         user_id: p.id, 
         full_name: p.full_name, 
         phone: p.phone,
         service_categories: ['Сантехника'],
         is_active: true
       })
       console.log('Made master:', p.full_name)
    }
  }

  console.log('Done.')
}

seed()

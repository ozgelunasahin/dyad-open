import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const sb = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const { data: prompts } = await sb
	.from('prompts')
	.select('id, title, state, region')
	.eq('state', 'published')
	.eq('region', 'berlin');

console.log('Published berlin prompts:', prompts?.length ?? 0);
prompts?.forEach(p => console.log(' ', p.id, p.title));

const { data: slots } = await sb
	.from('time_slots')
	.select('id, prompt_id, start_time, accepted')
	.order('start_time', { ascending: true });

const now = new Date();
const future = slots?.filter(s => new Date(s.start_time) > now) ?? [];
const past = slots?.filter(s => new Date(s.start_time) <= now) ?? [];

console.log(`\nAll slots: ${slots?.length} total, ${future.length} future, ${past.length} past`);
console.log('\nFuture slots:');
future.slice(0, 10).forEach(s => console.log(' ', s.start_time, 'accepted:', s.accepted, 'prompt:', s.prompt_id));

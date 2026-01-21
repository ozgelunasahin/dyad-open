/**
 * Fetch and manage feedback from Supabase
 *
 * Usage:
 *   npm run feedback                    # Show new feedback
 *   npm run feedback -- --all           # Show all feedback
 *   npm run feedback -- --status new    # Filter by status
 *   npm run feedback -- --type bug      # Filter by type
 *   npm run feedback -- --json          # Output as JSON
 *   npm run feedback -- --limit 10      # Limit results
 *   npm run feedback -- update <id> <status> [notes]  # Update feedback status
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing environment variables in .env:');
	console.error('  PUBLIC_SUPABASE_URL');
	console.error('  PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'wont_fix';

interface FeedbackItem {
	id: string;
	type: 'bug' | 'feature' | 'other';
	description: string;
	context: Record<string, unknown>;
	created_at: string;
	canvas_id: string | null;
	user_id: string;
	status: FeedbackStatus;
	reviewed_at: string | null;
	notes: string | null;
}

async function fetchFeedback(args: string[]) {
	let limit = 20;
	let typeFilter: string | null = null;
	let statusFilter: string | null = 'new'; // Default to showing new items
	let showAll = false;
	let jsonOutput = false;

	// Parse args
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--limit' && args[i + 1]) {
			limit = parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === '--type' && args[i + 1]) {
			typeFilter = args[i + 1];
			i++;
		} else if (args[i] === '--status' && args[i + 1]) {
			statusFilter = args[i + 1];
			i++;
		} else if (args[i] === '--all') {
			showAll = true;
			statusFilter = null;
		} else if (args[i] === '--json') {
			jsonOutput = true;
		}
	}

	let query = supabase
		.from('feedback')
		.select('id, type, description, context, created_at, canvas_id, user_id, status, reviewed_at, notes')
		.order('created_at', { ascending: false })
		.limit(limit);

	if (typeFilter) {
		query = query.eq('type', typeFilter);
	}

	if (statusFilter) {
		query = query.eq('status', statusFilter);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching feedback:', error.message);
		process.exit(1);
	}

	const items = (data || []) as FeedbackItem[];

	if (items.length === 0) {
		if (jsonOutput) {
			console.log(JSON.stringify([], null, 2));
		} else {
			const statusMsg = statusFilter ? ` with status '${statusFilter}'` : '';
			console.log(`No feedback found${statusMsg}.`);
			if (statusFilter === 'new') {
				console.log('Tip: Use --all to see all feedback, or --status reviewed to see reviewed items.');
			}
		}
		return;
	}

	if (jsonOutput) {
		console.log(JSON.stringify(items, null, 2));
		return;
	}

	const statusLabel = showAll ? 'all' : statusFilter || 'all';
	console.log(`\n📬 Feedback (${items.length} ${statusLabel} items)\n${'='.repeat(60)}\n`);

	for (const item of items) {
		const date = new Date(item.created_at).toLocaleString();
		const typeEmoji = item.type === 'bug' ? '🐛' : item.type === 'feature' ? '✨' : '💬';
		const statusEmoji = {
			new: '🆕',
			reviewed: '👀',
			in_progress: '🔧',
			resolved: '✅',
			wont_fix: '❌'
		}[item.status] || '❓';

		console.log(`${typeEmoji} [${item.type.toUpperCase()}] ${statusEmoji} ${item.status} | ${date}`);
		console.log(`   ID: ${item.id}`);
		console.log(`   Canvas: ${item.canvas_id || 'N/A'}`);
		console.log(`   Description: ${item.description}`);

		if (item.notes) {
			console.log(`   📝 Notes: ${item.notes}`);
		}

		if (item.context && typeof item.context === 'object') {
			const ctx = item.context;
			console.log(`   Context:`);
			if (ctx.focusedCardId) console.log(`     - Focused card: ${ctx.focusedCardId}`);
			if (ctx.cardCount !== undefined) console.log(`     - Card count: ${ctx.cardCount}`);
			if (ctx.camera) {
				const cam = ctx.camera as { x: number; y: number; zoom: number };
				console.log(`     - Camera: (${cam.x.toFixed(0)}, ${cam.y.toFixed(0)}) zoom=${cam.zoom.toFixed(2)}`);
			}
			if (ctx.viewport) {
				const vp = ctx.viewport as { width: number; height: number };
				console.log(`     - Viewport: ${vp.width}x${vp.height}`);
			}
			if (ctx.userAgent) {
				const ua = String(ctx.userAgent);
				const browser = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] || ua.slice(0, 50);
				console.log(`     - Browser: ${browser}`);
			}
			if (Array.isArray(ctx.recentErrors) && ctx.recentErrors.length > 0) {
				console.log(`     - Recent errors (${ctx.recentErrors.length}):`);
				for (const err of ctx.recentErrors.slice(0, 3)) {
					const e = err as { message?: string; type?: string };
					console.log(`       • ${e.type}: ${e.message}`);
				}
			}
		}
		console.log('');
	}

	console.log(`${'='.repeat(60)}`);
	console.log('To update status, use Supabase dashboard or run:');
	console.log(`  npx supabase db execute --sql "UPDATE feedback SET status='reviewed', reviewed_at=now() WHERE id='<id>'"`);
}

async function updateFeedback(id: string, status: FeedbackStatus, notes?: string) {
	const updateData: { status: FeedbackStatus; reviewed_at: string; notes?: string } = {
		status,
		reviewed_at: new Date().toISOString()
	};
	if (notes) {
		updateData.notes = notes;
	}

	const { error } = await supabase.from('feedback').update(updateData).eq('id', id);

	if (error) {
		console.error('Error updating feedback:', error.message);
		process.exit(1);
	}

	console.log(`✅ Updated feedback ${id} to status '${status}'`);
}

// Check if this is an update command
const args = process.argv.slice(2);
if (args[0] === 'update') {
	const id = args[1];
	const status = args[2] as FeedbackStatus;
	const notes = args.slice(3).join(' ') || undefined;

	if (!id || !status) {
		console.error('Usage: npm run feedback -- update <id> <status> [notes]');
		console.error('Status options: new, reviewed, in_progress, resolved, wont_fix');
		process.exit(1);
	}

	const validStatuses: FeedbackStatus[] = ['new', 'reviewed', 'in_progress', 'resolved', 'wont_fix'];
	if (!validStatuses.includes(status)) {
		console.error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
		process.exit(1);
	}

	updateFeedback(id, status, notes);
} else {
	fetchFeedback(args);
}

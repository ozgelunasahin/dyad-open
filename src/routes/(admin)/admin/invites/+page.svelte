<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Per-row compose state for re-send. Same shape as /admin/waitlist's
	// row-expansion form — opener + message keyed by email so drafts don't
	// collide across rows.
	let expandedEmail = $state<string | null>(null);
	let openerByEmail = $state<Record<string, string>>({});
	let messageByEmail = $state<Record<string, string>>({});
	let resendingEmail = $state<string | null>(null);
	let result = $state<{ email: string; message: string; url?: string } | null>(null);

	const MESSAGE_MAX = 2000;

	type Status = 'pending' | 'expired' | 'used';
	function statusLabel(s: Status): string {
		return s === 'pending' ? 'pending' : s === 'expired' ? 'expired' : 'signed up';
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function resend(email: string) {
		const opener = openerByEmail[email] ?? '';
		const message = messageByEmail[email] ?? '';
		resendingEmail = email;
		result = null;
		try {
			const res = await fetch('/api/invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					name: opener.trim() || undefined,
					message: message.trim() || undefined
				})
			});
			const body = await res.json();
			if (res.ok) {
				result = {
					email,
					message: body.alreadyInvited
						? 'Re-sent with the existing token.'
						: 'New invitation sent (previous one had expired).',
					url: body.inviteUrl
				};
				// Clear the draft + collapse on success
				const { [email]: _o, ...restOpeners } = openerByEmail;
				const { [email]: _m, ...restMessages } = messageByEmail;
				openerByEmail = restOpeners;
				messageByEmail = restMessages;
				expandedEmail = null;
			} else if (res.status === 409) {
				result = { email, message: 'This person has already signed up.' };
			} else {
				result = { email, message: body.error ?? 'Failed to re-send.' };
			}
		} catch {
			result = { email, message: 'Network error.' };
		} finally {
			resendingEmail = null;
		}
	}
</script>

<svelte:head>
	<title>Invites — Admin</title>
</svelte:head>

<h1 class="admin-title">Invites</h1>
<p class="admin-subtitle">{data.invites.length} total</p>

{#if result}
	<div class="result">
		<div class="result-main">
			<strong>{result.email}:</strong> {result.message}
			{#if result.url}
				<div class="result-url">Link: <a href={result.url}>{result.url}</a></div>
			{/if}
		</div>
		<button class="dismiss" onclick={() => (result = null)} aria-label="Dismiss">×</button>
	</div>
{/if}

{#if data.invites.length === 0}
	<p class="empty">No invitations sent yet.</p>
{:else}
	<div class="invite-rows">
		{#each data.invites as inv}
			<div class="invite-row">
				<div class="invite-info">
					<div class="invite-header">
						<span class="invite-email">{inv.email}</span>
						<span class="badge badge-{inv.status}">{statusLabel(inv.status)}</span>
					</div>
					<div class="invite-meta">
						Sent {formatDate(inv.created_at)}
						{#if inv.invited_by_username}
							<span class="by">by @{inv.invited_by_username}</span>
						{/if}
						{#if inv.status === 'pending'}
							<span class="dot">·</span>
							expires {formatDate(inv.expires_at)}
						{:else if inv.status === 'used' && inv.used_at}
							<span class="dot">·</span>
							signed up {formatDate(inv.used_at)}
						{/if}
					</div>

					{#if expandedEmail === inv.email}
						<label class="compose">
							<span>Opener <em>(optional, verbatim at the top)</em></span>
							<input
								type="text"
								bind:value={openerByEmail[inv.email]}
								placeholder={'e.g. "Hi Ozge," or "Hey T —"'}
								disabled={resendingEmail === inv.email}
							/>
						</label>
						<label class="compose">
							<span>
								Message <em>(optional, rendered as a quote)</em>
								<span class="charcount" class:over={(messageByEmail[inv.email]?.length ?? 0) > MESSAGE_MAX}>
									{messageByEmail[inv.email]?.length ?? 0} / {MESSAGE_MAX}
								</span>
							</span>
							<textarea
								bind:value={messageByEmail[inv.email]}
								rows={3}
								maxlength={MESSAGE_MAX}
								placeholder="A line or two — why you're reaching out again, any context they'd want."
								disabled={resendingEmail === inv.email}
							></textarea>
						</label>
					{/if}
				</div>

				<div class="invite-actions">
					{#if inv.status === 'used'}
						<span class="status-done">Joined</span>
					{:else if expandedEmail === inv.email}
						<button
							class="btn-primary"
							onclick={() => resend(inv.email)}
							disabled={resendingEmail === inv.email ||
								(messageByEmail[inv.email]?.length ?? 0) > MESSAGE_MAX}
						>
							{resendingEmail === inv.email ? 'Sending...' : 'Re-send'}
						</button>
						<button
							class="btn-ghost"
							onclick={() => (expandedEmail = null)}
							disabled={resendingEmail === inv.email}
						>
							Cancel
						</button>
					{:else}
						<button class="btn-primary" onclick={() => (expandedEmail = inv.email)}>
							{inv.status === 'expired' ? 'Re-send (new link)' : 'Re-send'}
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.admin-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-1); }
	.admin-subtitle { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-6); }

	.empty { color: var(--text-muted); font-style: italic; }

	.result {
		padding: var(--space-3) var(--space-4);
		background: rgba(61, 158, 90, 0.08);
		border-radius: var(--radius-input);
		margin-bottom: var(--space-4);
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		font-size: var(--text-sm);
	}
	.result-main { flex: 1; min-width: 0; }
	.result-url { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); word-break: break-all; }
	.dismiss { margin-left: auto; font-size: var(--text-lg); color: var(--text-muted); }

	.invite-rows { display: flex; flex-direction: column; }
	.invite-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--border-link);
		gap: var(--space-4);
	}
	.invite-row:last-child { border-bottom: none; }

	.invite-info { flex: 1; min-width: 0; }
	.invite-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); flex-wrap: wrap; }
	.invite-email { font-family: var(--font-mono); font-size: var(--text-sm); }
	.invite-meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.invite-meta .by { margin-left: var(--space-2); }
	.invite-meta .dot { margin: 0 var(--space-2); }

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.badge-pending { background: rgba(245,158,11,0.12); color: #b45309; }
	.badge-expired { background: rgba(239,68,68,0.12); color: #dc2626; }
	.badge-used { background: rgba(61,158,90,0.12); color: #2d7a42; }

	.compose { display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-3); font-size: var(--text-sm); }
	.compose > span { color: var(--text-secondary); display: flex; align-items: baseline; gap: var(--space-2); }
	.compose em { font-style: normal; color: var(--text-muted); font-size: var(--text-xs); }

	.charcount { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.charcount.over { color: var(--color-danger); }

	input, textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-family: inherit;
		font-size: var(--text-sm);
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
		resize: vertical;
	}
	input:focus, textarea:focus { outline: none; border-color: var(--text-muted); }
	input:disabled, textarea:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	.invite-actions { flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-2); }
	.btn-ghost {
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.btn-ghost:hover { color: var(--text-primary); }
	.btn-ghost:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	.status-done { font-family: var(--font-mono); font-size: var(--text-xs); color: #2d7a42; }
</style>

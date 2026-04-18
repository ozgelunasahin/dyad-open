<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Per-row compose state: which row is expanded, and what opener + message
	// the admin has typed for each email. Keyed by email so reopening a row
	// keeps the draft. Both are shared across the row's Send button.
	let expandedEmail = $state<string | null>(null);
	let openerByEmail = $state<Record<string, string>>({});
	let messageByEmail = $state<Record<string, string>>({});
	let invitingEmail = $state<string | null>(null);
	let inviteResult = $state<{ email: string; message: string; url?: string } | null>(null);

	const MESSAGE_MAX = 2000;

	async function send(email: string, name: string | null, message: string) {
		invitingEmail = email;
		inviteResult = null;
		try {
			const res = await fetch('/api/invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name, message: message.trim() || undefined })
			});
			const body = await res.json();
			if (res.ok) {
				inviteResult = {
					email,
					message: body.alreadyInvited ? 'Already had a valid invite — email re-sent.' : 'Invited.',
					url: body.inviteUrl
				};
			} else if (res.status === 409) {
				inviteResult = { email, message: 'Already signed up.' };
			} else {
				inviteResult = { email, message: body.error ?? 'Failed to invite.' };
			}
		} catch {
			inviteResult = { email, message: 'Network error.' };
		} finally {
			invitingEmail = null;
		}
	}

	async function inviteWaitlisted(email: string) {
		// The contact's stored `name` is their first name from /waitlist —
		// don't reuse it as the opener, since the opener is a full salutation
		// line the admin writes by hand ("Hi Ozge,", "Hey T —"). An unfilled
		// opener means no greeting paragraph renders.
		const opener = openerByEmail[email] ?? '';
		const msg = messageByEmail[email] ?? '';
		await send(email, opener.trim() || null, msg);
		if (inviteResult && !inviteResult.message.startsWith('Failed') && !inviteResult.message.startsWith('Network')) {
			const { [email]: _o, ...restOpeners } = openerByEmail;
			const { [email]: _m, ...restMessages } = messageByEmail;
			openerByEmail = restOpeners;
			messageByEmail = restMessages;
			expandedEmail = null;
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Waitlist — Admin</title>
</svelte:head>

<h1 class="admin-title">Waitlist</h1>
<p class="admin-subtitle">{data.waitlist.length} contacts</p>

{#if inviteResult}
	<div class="invite-result">
		<div class="invite-result-main">
			<strong>{inviteResult.email}:</strong> {inviteResult.message}
			{#if inviteResult.url}
				<div class="invite-url">Link: <a href={inviteResult.url}>{inviteResult.url}</a></div>
			{/if}
		</div>
		<button class="dismiss" onclick={() => (inviteResult = null)} aria-label="Dismiss">×</button>
	</div>
{/if}

<div class="waitlist">
	{#each data.waitlist as contact}
		<div class="contact-row">
			<div class="contact-info">
				<div class="contact-header">
					<span class="contact-name">{contact.name ?? 'Anonymous'}</span>
					<span class="contact-email">{contact.email}</span>
					<span class="badge badge-{contact.status}">{contact.status.replace('_', ' ')}</span>
				</div>
				{#if contact.based_in}
					<span class="contact-city">{contact.based_in}</span>
				{/if}
				{#if contact.freewrite}
					<p class="contact-freewrite">
						{contact.freewrite.length > 200 ? contact.freewrite.slice(0, 200) + '...' : contact.freewrite}
					</p>
				{/if}
				<span class="contact-date">{formatDate(contact.created_at)}</span>

				{#if expandedEmail === contact.email}
					<label class="compose">
						<span>Opener <em>(optional, verbatim at the top)</em></span>
						<input
							type="text"
							bind:value={openerByEmail[contact.email]}
							placeholder={'e.g. "Hi ' + (contact.name ?? 'there') + ',"'}
							disabled={invitingEmail === contact.email}
						/>
					</label>
					<label class="compose">
						<span
							>Message <em>(optional, rendered as a quote)</em>
							<span
								class="charcount"
								class:over={(messageByEmail[contact.email]?.length ?? 0) > MESSAGE_MAX}
								>{messageByEmail[contact.email]?.length ?? 0} / {MESSAGE_MAX}</span
							></span
						>
						<textarea
							bind:value={messageByEmail[contact.email]}
							rows={3}
							maxlength={MESSAGE_MAX}
							placeholder="A line or two — why you thought of them, what to expect."
							disabled={invitingEmail === contact.email}
						></textarea>
					</label>
				{/if}
			</div>
			<div class="contact-actions">
				{#if contact.status === 'not_invited' || contact.status === 'expired'}
					{#if expandedEmail === contact.email}
						<button
							class="btn-primary"
							onclick={() => inviteWaitlisted(contact.email)}
							disabled={invitingEmail === contact.email}
						>
							{invitingEmail === contact.email
								? 'Sending...'
								: contact.status === 'expired'
									? 'Re-invite'
									: 'Send invite'}
						</button>
						<button class="btn-ghost" onclick={() => (expandedEmail = null)} disabled={invitingEmail === contact.email}>
							Cancel
						</button>
					{:else}
						<button class="btn-primary" onclick={() => (expandedEmail = contact.email)}>
							{contact.status === 'expired' ? 'Re-invite' : 'Invite'}
						</button>
					{/if}
				{:else if contact.status === 'signed_up'}
					<span class="status-done">Joined</span>
				{:else}
					<span class="status-pending">Pending</span>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.admin-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-1); }
	.admin-subtitle { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-6); }

	.invite-result {
		padding: var(--space-3) var(--space-4);
		background: rgba(61, 158, 90, 0.08);
		border-radius: var(--radius-input);
		margin-bottom: var(--space-4);
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		font-size: var(--text-sm);
	}
	.invite-result-main { flex: 1; min-width: 0; }
	.invite-url { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); word-break: break-all; }
	.dismiss { margin-left: auto; font-size: var(--text-lg); color: var(--text-muted); }

	.compose {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin-top: var(--space-3);
		font-size: var(--text-sm);
	}
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

	.contact-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--border-link);
		gap: var(--space-4);
	}
	.contact-row:last-child { border-bottom: none; }

	.contact-info { flex: 1; min-width: 0; }
	.contact-header { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-1); }
	.contact-name { font-weight: 500; }
	.contact-email { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.contact-city { font-size: var(--text-sm); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }
	.contact-freewrite { font-size: var(--text-sm); color: var(--text-secondary); margin: var(--space-2) 0; line-height: var(--leading-normal); }
	.contact-date { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.badge-not_invited { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-muted); }
	.badge-invited { background: rgba(245,158,11,0.12); color: #b45309; }
	.badge-expired { background: rgba(239,68,68,0.12); color: #dc2626; }
	.badge-signed_up { background: rgba(61,158,90,0.12); color: #2d7a42; }

	.contact-actions { flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-2); }
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
	.status-pending { font-family: var(--font-mono); font-size: var(--text-xs); color: #b45309; }
</style>

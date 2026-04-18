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

	// Direct-invite (people who aren't on the waitlist, or a batch of them) form state.
	// Emails are entered as free text (one per line or comma-separated) and parsed
	// into a normalised list on the fly. Name + message are shared across the batch.
	let directEmailsText = $state('');
	let directName = $state('');
	let directMessage = $state('');
	let directOpen = $state(false);
	let directSending = $state(false);
	// Per-email outcome for the current batch: 'pending' | 'sending' | 'sent' | 'resent' | 'joined' | 'failed'
	type BatchStatus = 'pending' | 'sending' | 'sent' | 'resent' | 'joined' | 'failed';
	let batchStatus = $state<Record<string, { status: BatchStatus; note?: string }>>({});

	const MESSAGE_MAX = 2000;
	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	/** Normalise the textarea into a deduped, lowercased list of plausibly-valid emails. */
	function parseEmails(text: string): { valid: string[]; invalid: string[] } {
		const seen = new Set<string>();
		const valid: string[] = [];
		const invalid: string[] = [];
		for (const raw of text.split(/[\s,;]+/)) {
			const candidate = raw.trim().toLowerCase();
			if (!candidate) continue;
			if (seen.has(candidate)) continue;
			seen.add(candidate);
			(EMAIL_RE.test(candidate) ? valid : invalid).push(candidate);
		}
		return { valid, invalid };
	}

	const parsedEmails = $derived(parseEmails(directEmailsText));

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

	/** POSTs one invite. Does not touch the shared inviteResult banner — batch
	 *  sends have their own per-row status panel instead. */
	async function sendOne(
		email: string,
		name: string | null,
		message: string
	): Promise<{ status: BatchStatus; note?: string }> {
		try {
			const res = await fetch('/api/invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name, message: message.trim() || undefined })
			});
			const body = await res.json();
			if (res.ok) {
				return {
					status: body.alreadyInvited ? 'resent' : 'sent',
					note: body.alreadyInvited ? 'had a valid invite — email re-sent' : undefined
				};
			}
			if (res.status === 409) return { status: 'joined', note: 'already signed up' };
			return { status: 'failed', note: body.error ?? `HTTP ${res.status}` };
		} catch {
			return { status: 'failed', note: 'network error' };
		}
	}

	async function sendBatch(e: Event) {
		e.preventDefault();
		const { valid } = parsedEmails;
		if (valid.length === 0) return;

		directSending = true;
		batchStatus = Object.fromEntries(valid.map((e) => [e, { status: 'pending' as BatchStatus }]));

		const sharedName = directName.trim() || null;
		const sharedMessage = directMessage;
		for (const email of valid) {
			batchStatus = { ...batchStatus, [email]: { status: 'sending' } };
			const result = await sendOne(email, sharedName, sharedMessage);
			batchStatus = { ...batchStatus, [email]: result };
		}

		directSending = false;
	}

	function resetBatch() {
		directEmailsText = '';
		directName = '';
		directMessage = '';
		batchStatus = {};
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

<!-- Direct invite: people who aren't on the waitlist, single or batch. -->
<div class="direct-invite">
	{#if !directOpen}
		<button class="direct-toggle" onclick={() => (directOpen = true)}>+ Send invitations</button>
	{:else}
		<form class="direct-form" onsubmit={sendBatch}>
			<div class="direct-header">
				<strong>Send invitations</strong>
				<button
					type="button"
					class="direct-close"
					onclick={() => {
						directOpen = false;
						resetBatch();
					}}
					aria-label="Close"
				>×</button>
			</div>

			<label class="direct-field">
				<span>
					Emails <em>(one per line or comma-separated)</em>
					{#if parsedEmails.valid.length > 0 || parsedEmails.invalid.length > 0}
						<span class="parsed-count">
							{parsedEmails.valid.length} ready{parsedEmails.invalid.length > 0
								? `, ${parsedEmails.invalid.length} invalid`
								: ''}
						</span>
					{/if}
				</span>
				<textarea
					bind:value={directEmailsText}
					rows={3}
					placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
					disabled={directSending}
				></textarea>
				{#if parsedEmails.invalid.length > 0}
					<p class="parsed-invalid">
						Not a valid email: {parsedEmails.invalid.join(', ')}
					</p>
				{/if}
			</label>

			<label class="direct-field">
				<span>Opener <em>(optional, shared across the batch — rendered verbatim at the top of the email)</em></span>
				<input
					type="text"
					bind:value={directName}
					placeholder="e.g. &quot;Hi Ozge,&quot; or &quot;Hey T —&quot;. Leave blank to skip the greeting."
					disabled={directSending}
				/>
			</label>

			<label class="direct-field">
				<span>
					Message <em>(optional, shared across the batch — appears above the default copy)</em>
					<span class="charcount" class:over={directMessage.length > MESSAGE_MAX}>
						{directMessage.length} / {MESSAGE_MAX}
					</span>
				</span>
				<textarea
					bind:value={directMessage}
					rows={4}
					maxlength={MESSAGE_MAX}
					placeholder="A line or two — why you thought of them, what to expect."
					disabled={directSending}
				></textarea>
			</label>

			<button
				type="submit"
				class="btn-primary"
				disabled={directSending || parsedEmails.valid.length === 0 || directMessage.length > MESSAGE_MAX}
			>
				{directSending
					? 'Sending...'
					: parsedEmails.valid.length <= 1
						? 'Send invite'
						: `Send ${parsedEmails.valid.length} invites`}
			</button>

			{#if Object.keys(batchStatus).length > 0}
				<ul class="batch-status">
					{#each Object.entries(batchStatus) as [email, row]}
						<li class="batch-row batch-row-{row.status}">
							<span class="batch-email">{email}</span>
							<span class="batch-badge">{row.status}</span>
							{#if row.note}<span class="batch-note">{row.note}</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</form>
	{/if}
</div>

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

	.direct-invite {
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-4);
		border-bottom: 1px dashed color-mix(in srgb, var(--text-primary) 15%, transparent);
	}
	.direct-toggle {
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--text-link);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.direct-toggle:hover { color: var(--text-link-hover); }

	.direct-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 540px;
	}
	.direct-header { display: flex; align-items: center; justify-content: space-between; }
	.direct-close { background: none; border: none; font-size: var(--text-lg); color: var(--text-muted); cursor: pointer; }
	.direct-field { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); }
	.direct-field > span { color: var(--text-secondary); display: flex; align-items: baseline; gap: var(--space-2); }
	.direct-field em { font-style: normal; color: var(--text-muted); font-size: var(--text-xs); }

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

	.parsed-count { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.parsed-invalid { margin: var(--space-1) 0 0; font-size: var(--text-xs); color: var(--color-danger); }

	.batch-status {
		list-style: none;
		padding: 0;
		margin: var(--space-3) 0 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}
	.batch-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-input);
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
	}
	.batch-email { font-family: var(--font-mono); font-size: var(--text-xs); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.batch-badge { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 3px; background: color-mix(in srgb, var(--text-primary) 8%, transparent); color: var(--text-muted); }
	.batch-note { font-size: var(--text-xs); color: var(--text-muted); }
	.batch-row-sent .batch-badge, .batch-row-resent .batch-badge { background: rgba(61,158,90,0.15); color: #2d7a42; }
	.batch-row-failed .batch-badge { background: rgba(239,68,68,0.15); color: #dc2626; }
	.batch-row-joined .batch-badge { background: rgba(245,158,11,0.15); color: #b45309; }
	.batch-row-sending .batch-badge { background: rgba(59,130,246,0.15); color: #2563eb; }
	.batch-row-pending .batch-badge { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-muted); }

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

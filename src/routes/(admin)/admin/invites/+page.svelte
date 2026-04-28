<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Per-row compose state for re-send. Opener + message keyed by email so
	// drafts don't collide across rows.
	let expandedEmail = $state<string | null>(null);
	let openerByEmail = $state<Record<string, string>>({});
	let messageByEmail = $state<Record<string, string>>({});
	let resendingEmail = $state<string | null>(null);
	let result = $state<{ email: string; message: string; url?: string } | null>(null);

	// Direct-invite (batch) form state. Emails are entered as free text
	// (one per line or comma-separated) and parsed into a normalised list
	// on the fly. Opener + message are shared across the batch.
	let directEmailsText = $state('');
	let directName = $state('');
	let directMessage = $state('');
	let directOpen = $state(false);
	let directSending = $state(false);
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

	/** POSTs one invite. Does not touch the shared result banner — batch
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
			const outcome = await sendOne(email, sharedName, sharedMessage);
			batchStatus = { ...batchStatus, [email]: outcome };
		}

		directSending = false;
	}

	function resetBatch() {
		directEmailsText = '';
		directName = '';
		directMessage = '';
		batchStatus = {};
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

<!-- Direct invite: someone who is not on the waitlist, single or batch. -->
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
				<span>Opener <em>(optional, shared across the batch — verbatim at the top of the email)</em></span>
				<input
					type="text"
					bind:value={directName}
					placeholder="e.g. &quot;Hi Ozge,&quot; or &quot;Hey T —&quot;. Leave blank to skip the greeting."
					disabled={directSending}
				/>
			</label>

			<label class="direct-field">
				<span>
					Message <em>(optional, shared across the batch — rendered as a quote above the default copy)</em>
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

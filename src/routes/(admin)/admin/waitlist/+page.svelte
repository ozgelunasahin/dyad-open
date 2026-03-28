<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let invitingEmail = $state<string | null>(null);
	let inviteResult = $state<{ email: string; message: string } | null>(null);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	async function invite(email: string, name: string | null) {
		invitingEmail = email;
		inviteResult = null;
		try {
			const res = await fetch('/api/invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name })
			});
			const body = await res.json();
			if (res.ok) {
				if (body.alreadyInvited) {
					inviteResult = { email, message: 'Already has a valid invitation' };
				} else {
					inviteResult = { email, message: `Invited! Link: ${body.inviteUrl}` };
				}
			} else if (res.status === 409) {
				inviteResult = { email, message: 'Already signed up' };
			} else {
				inviteResult = { email, message: body.error ?? 'Failed to invite' };
			}
		} catch {
			inviteResult = { email, message: 'Network error' };
		} finally {
			invitingEmail = null;
		}
	}
</script>

<svelte:head>
	<title>Waitlist — Admin</title>
</svelte:head>

<h1 class="admin-title">Waitlist</h1>
<p class="admin-subtitle">{data.waitlist.length} contacts</p>

{#if inviteResult}
	<div class="invite-result">
		<strong>{inviteResult.email}:</strong> {inviteResult.message}
		<button class="dismiss" onclick={() => inviteResult = null}>×</button>
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
					<p class="contact-freewrite">{contact.freewrite.length > 200 ? contact.freewrite.slice(0, 200) + '...' : contact.freewrite}</p>
				{/if}
				<span class="contact-date">{formatDate(contact.created_at)}</span>
			</div>
			<div class="contact-actions">
				{#if contact.status === 'not_invited' || contact.status === 'expired'}
					<button
						class="btn-primary"
						onclick={() => invite(contact.email, contact.name)}
						disabled={invitingEmail === contact.email}
					>
						{invitingEmail === contact.email ? 'Inviting...' : contact.status === 'expired' ? 'Re-invite' : 'Invite'}
					</button>
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
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-sm);
		word-break: break-all;
	}
	.dismiss { margin-left: auto; font-size: var(--text-lg); color: var(--text-muted); }

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
	.badge-not_invited { background: rgba(0,0,0,0.06); color: var(--text-muted); }
	.badge-invited { background: rgba(245,158,11,0.12); color: #b45309; }
	.badge-expired { background: rgba(239,68,68,0.12); color: #dc2626; }
	.badge-signed_up { background: rgba(61,158,90,0.12); color: #2d7a42; }

	.contact-actions { flex-shrink: 0; }
	.status-done { font-family: var(--font-mono); font-size: var(--text-xs); color: #2d7a42; }
	.status-pending { font-family: var(--font-mono); font-size: var(--text-xs); color: #b45309; }
</style>

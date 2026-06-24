<script lang="ts">
	import type { PageData } from './$types';
	import { PROTECTED_ACTIONS, PROTECTED_ACTION_META, type ProtectedAction } from '$lib/domain/gating';

	let { data }: { data: PageData } = $props();

	let emailNotificationsEnabled = $state(data.emailNotificationsEnabled);
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Per-action gating, copy-on-write so the checkboxes stay reactive.
	let gating = $state<Record<string, boolean>>({ ...data.membershipGating });
	let gatingSaving = $state<string | null>(null);
	let gatingError = $state<string | null>(null);

	async function toggleEmailNotifications(event: Event) {
		const target = event.target as HTMLInputElement;
		const next = target.checked;
		saving = true;
		error = null;
		try {
			const res = await fetch('/admin/settings/api', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email_notifications_enabled: next })
			});
			if (res.ok) {
				emailNotificationsEnabled = next;
			} else {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? 'Failed to update setting.';
				target.checked = !next;
			}
		} catch {
			error = 'Network error.';
			target.checked = !next;
		} finally {
			saving = false;
		}
	}

	async function toggleGating(action: ProtectedAction, event: Event) {
		const target = event.target as HTMLInputElement;
		const next = target.checked;

		// Confirm before turning gating ON — it locks the action behind membership.
		if (next && !confirm(`This will require an active membership to: ${PROTECTED_ACTION_META[action].label.toLowerCase()}.`)) {
			target.checked = false;
			return;
		}

		gatingSaving = action;
		gatingError = null;
		const desired = { ...gating, [action]: next };
		try {
			const res = await fetch('/admin/settings/api', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ membership_gating: desired })
			});
			if (res.ok) {
				const body = await res.json().catch(() => ({}));
				gating = { ...(body.membership_gating ?? desired) };
			} else {
				const body = await res.json().catch(() => ({}));
				gatingError = body.error ?? 'Failed to update gating.';
				target.checked = !next;
			}
		} catch {
			gatingError = 'Network error.';
			target.checked = !next;
		} finally {
			gatingSaving = null;
		}
	}
</script>

<svelte:head>
	<title>Settings — Admin</title>
</svelte:head>

<h1 class="admin-title">Settings</h1>
<p class="admin-subtitle">Global runtime configuration.</p>

<section class="setting">
	<label class="setting-row">
		<input
			type="checkbox"
			checked={emailNotificationsEnabled}
			disabled={saving}
			onchange={toggleEmailNotifications}
		/>
		<div class="setting-body">
			<span class="setting-label">Transactional email notifications</span>
			<span class="setting-hint">
				When on, the four dyadic events (invitation received, accepted,
				declined, meeting cancelled) can send email. When off, every
				notification is dropped before recipient lookup — no email is
				sent. This is the master gate; mail additionally requires that
				the member has added a notification address in their profile
				preferences (strictly opt-in — the account email is never
				used), and per-event opt-outs are honoured while this is on.
			</span>
		</div>
	</label>
	{#if error}
		<p class="setting-error">{error}</p>
	{/if}
</section>

<section class="setting">
	<div class="setting-body">
		<span class="setting-label">Membership-gated actions</span>
		<span class="setting-hint">
			Each toggle requires an active membership to perform that action.
			Reading and browsing are never gated. All off (the default) means
			every registered guest can do everything; turning some on creates a
			browse-free / interact-paid model.
		</span>
	</div>
	<div class="gating-list">
		{#each PROTECTED_ACTIONS as action (action)}
			<label class="setting-row gating-row">
				<input
					type="checkbox"
					checked={gating[action] ?? false}
					disabled={gatingSaving !== null}
					onchange={(e) => toggleGating(action, e)}
				/>
				<div class="setting-body">
					<span class="setting-label">{PROTECTED_ACTION_META[action].label}</span>
					<span class="setting-hint">{PROTECTED_ACTION_META[action].hint}</span>
				</div>
			</label>
		{/each}
	</div>
	{#if gatingError}
		<p class="setting-error">{gatingError}</p>
	{/if}
</section>

<style>
	.admin-title {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: 0 0 var(--space-1);
	}
	.admin-subtitle {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0 0 var(--space-6);
	}

	.setting {
		padding: var(--space-5);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		background: var(--bg-canvas);
		margin-bottom: var(--space-5);
	}

	.setting-row {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		cursor: pointer;
	}

	.setting-row input[type='checkbox'] {
		width: var(--space-5);
		height: var(--space-5);
		margin-top: 2px;
		accent-color: var(--text-primary);
		cursor: pointer;
	}

	.setting-row input[type='checkbox']:disabled {
		cursor: progress;
	}

	.setting-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.setting-label {
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--text-primary);
	}

	.setting-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
	}

	.gating-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	.setting-error {
		font-size: var(--text-sm);
		color: var(--text-danger, #b03a2e);
		margin: var(--space-3) 0 0;
	}
</style>

<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let emailNotificationsEnabled = $state(data.emailNotificationsEnabled);
	let saving = $state(false);
	let error = $state<string | null>(null);

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
				declined, meeting cancelled) send email to the relevant member.
				When off, every notification is dropped before recipient lookup —
				no email is sent. Per-member opt-out is not yet wired into the
				app UI; this is the only switch.
			</span>
		</div>
	</label>
	{#if error}
		<p class="setting-error">{error}</p>
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

	.setting-error {
		font-size: var(--text-sm);
		color: var(--text-danger, #b03a2e);
		margin: var(--space-3) 0 0;
	}
</style>

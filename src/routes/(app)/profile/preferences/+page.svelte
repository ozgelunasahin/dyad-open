<script lang="ts">
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	const FLAGS = [
		{ key: 'invitation_received', label: copy.preferences.prefInvitationReceived },
		{ key: 'invitation_answered', label: copy.preferences.prefInvitationAnswered },
		{ key: 'meeting_cancelled', label: copy.preferences.prefMeetingCancelled }
	] as const;
	type FlagKey = (typeof FLAGS)[number]['key'];

	let savedEmail = $state(data.settings.email);
	let emailInput = $state(data.settings.email ?? '');
	let flags = $state({
		invitation_received: data.settings.invitation_received,
		invitation_answered: data.settings.invitation_answered,
		meeting_cancelled: data.settings.meeting_cancelled
	});
	let saving = $state(false);
	let emailError = $state<string | null>(null);

	const emailDirty = $derived(emailInput.trim() !== (savedEmail ?? ''));

	async function patch(payload: Record<string, unknown>): Promise<boolean> {
		const res = await fetch('/api/profile/preferences', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		return res.ok;
	}

	// The address is the opt-in: saving one turns notifications on for this
	// member; clearing it turns them off entirely.
	async function saveEmail(event: SubmitEvent) {
		event.preventDefault();
		const next = emailInput.trim() || null;
		saving = true;
		emailError = null;
		try {
			if (await patch({ email: next })) {
				savedEmail = next;
				emailInput = next ?? '';
			} else {
				emailError = copy.preferences.emailError;
			}
		} catch {
			emailError = copy.preferences.emailError;
		} finally {
			saving = false;
		}
	}

	async function toggleFlag(key: FlagKey, event: Event) {
		const target = event.target as HTMLInputElement;
		const next = target.checked;
		saving = true;
		try {
			if (await patch({ [key]: next })) {
				flags[key] = next;
			} else {
				target.checked = !next;
			}
		} catch {
			target.checked = !next;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{copy.preferences.title} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<a href="/profile" class="back-link">{copy.preferences.backToProfile}</a>
	<h1 class="page-title">{copy.preferences.title}</h1>

	<form class="email-row" onsubmit={saveEmail}>
		<input
			type="email"
			bind:value={emailInput}
			placeholder={copy.preferences.emailPlaceholder}
			aria-label={copy.preferences.emailAriaLabel}
			disabled={saving}
		/>
		{#if emailDirty}
			<button type="submit" class="save-btn" disabled={saving}>{copy.preferences.save}</button>
		{/if}
	</form>
	{#if emailError}
		<p class="email-error">{emailError}</p>
	{/if}

	<section class="events" class:off={!savedEmail}>
		<p class="section-label">{copy.preferences.emailPrefsHeading}</p>
		{#each FLAGS as flag (flag.key)}
			<label class="pref-row">
				<input
					type="checkbox"
					checked={flags[flag.key]}
					disabled={saving || !savedEmail}
					onchange={(e) => toggleFlag(flag.key, e)}
				/>
				<span>{flag.label}</span>
			</label>
		{/each}
	</section>
</div>

<style>
	.content {
		width: 100%;
		max-width: var(--content-standard);
		padding-bottom: var(--nav-clearance);
	}

	.back-link {
		display: inline-block;
		margin-top: var(--space-6);
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-decoration: underline;
		text-decoration-color: transparent;
	}
	.back-link:hover {
		color: var(--text-primary);
	}

	.page-title {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: var(--space-4) 0 var(--space-6);
	}

	.email-row {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.email-row input[type='email'] {
		flex: 1;
		max-width: 360px;
		padding: var(--space-2) var(--space-3);
		font-family: inherit;
		font-size: var(--text-base);
		color: var(--text-primary);
		background: var(--bg-canvas);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-input, 6px);
	}

	.email-row input[type='email']:disabled {
		cursor: progress;
	}

	.save-btn {
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--text-primary);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
	}

	.save-btn:disabled {
		cursor: progress;
		color: var(--text-muted);
	}

	.email-error {
		margin: var(--space-2) 0 0;
		font-size: var(--text-sm);
		color: var(--text-danger, #b03a2e);
	}

	.events {
		margin-top: var(--space-6);
	}

	.events.off {
		opacity: 0.5;
	}

	.section-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-3);
	}

	.pref-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-base);
		color: var(--text-primary);
		cursor: pointer;
	}

	.pref-row + .pref-row {
		margin-top: var(--space-2);
	}

	.pref-row input[type='checkbox'] {
		width: var(--space-4);
		height: var(--space-4);
		accent-color: var(--text-primary);
		cursor: pointer;
	}

	.pref-row input[type='checkbox']:disabled {
		cursor: default;
	}
</style>

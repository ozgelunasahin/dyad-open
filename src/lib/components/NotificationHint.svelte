<script lang="ts">
	import { copy } from '$lib/copy';

	// A quiet, presentational hint shown at a notification moment for members who
	// have no notification address set. Visibility is the caller's decision
	// ({#if !data.hasNotificationEmail}); this component holds no state and no
	// fetch. The `message` string carries a single `{link}` marker where the
	// linked words (copy.preferences.notificationHintLink) render, pointing to the
	// existing opt-in form. It never names email and never captures an address.
	let { message }: { message: string } = $props();

	// Split once on the {link} marker; the gap is where the link renders.
	const parts = $derived(message.split('{link}'));
</script>

<p class="notification-hint">
	{parts[0] ?? ''}<a href="/profile/preferences">{copy.preferences.notificationHintLink}</a>{parts[1] ?? ''}
</p>

<style>
	/* Quiet inline note — mirrors .response-status / .empty-nudge: muted, no card
	   chrome, anchored to the moment above it. Carries an option, not a demand. */
	.notification-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
		margin: var(--space-3) 0 0;
	}

	.notification-hint a {
		color: var(--text-muted);
		text-decoration: underline;
		text-decoration-color: var(--border-link);
		transition:
			color 0.15s,
			text-decoration-color 0.15s;
	}

	.notification-hint a:hover {
		color: var(--text-primary);
		text-decoration-color: currentColor;
	}
</style>

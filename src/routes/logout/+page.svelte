<script lang="ts">
	import { copy } from '$lib/copy';
</script>

<svelte:head>
	<title>Sign out — dyad.</title>
</svelte:head>

<div class="page">
	<form method="POST" class="signout-form">
		<p class="prompt">Sign out of dyad?</p>
		<div class="actions">
			<button type="submit" class="primary">{copy.nav.signOut}</button>
			<a href="/discover" class="secondary">Cancel</a>
		</div>
	</form>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-canvas);
		padding: var(--space-6);
	}
	.signout-form {
		max-width: 360px;
		width: 100%;
		text-align: center;
	}
	.prompt {
		font-size: var(--text-lg);
		color: var(--text-primary);
		margin: 0 0 var(--space-6);
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.primary {
		font-size: var(--text-base);
		padding: var(--space-3) var(--space-6);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		cursor: pointer;
	}
	.primary:hover { opacity: var(--opacity-hover-btn); }
	.secondary {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-decoration: none;
		padding: var(--space-2);
	}
	.secondary:hover { color: var(--text-primary); }
</style>

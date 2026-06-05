<script lang="ts">
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{copy.auth.accessEndedPageTitle}</title>
</svelte:head>

<div class="auth-card">
	<h1>{copy.auth.accessEndedTitle}</h1>
	<p class="subtitle">
		{data.cornerName
			? copy.auth.accessEndedSubtitleWithCorner.replace('{name}', data.cornerName)
			: copy.auth.accessEndedSubtitle}
	</p>
	<p class="forward-path">{copy.auth.accessEndedForwardPath}</p>

	<form method="POST" action="/logout">
		<button type="submit" class="btn-primary btn-primary--block">{copy.auth.logOut}</button>
	</form>
</div>

<style>
	.auth-card {
		width: 100%;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 var(--space-2) 0;
		font-size: var(--text-3xl);
		font-weight: 300;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0 0 var(--space-4) 0;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.forward-path {
		margin: 0 0 var(--space-6) 0;
		color: var(--text-muted);
		font-size: var(--text-md);
	}
</style>

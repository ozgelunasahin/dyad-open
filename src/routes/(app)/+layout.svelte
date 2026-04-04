<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import MeetingFeedbackModal from '$lib/components/MeetingFeedbackModal.svelte';
	import { initPosthog, capture } from '$lib/analytics';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let posthogReady = $state(false);

	// PostHog disabled — re-enable after privacy/reliability fixes land (#101)
	// onMount(async () => {
	// 	if (!env.PUBLIC_POSTHOG_KEY) return;
	// 	await initPosthog(env.PUBLIC_POSTHOG_KEY, data.user?.id, data.username);
	// 	posthogReady = true;
	// });

	// $effect(() => {
	// 	if (!posthogReady || !browser) return;
	// 	capture('$pageview', { path: $page.url.pathname });
	// });
</script>

<main class="main-content">
	{@render children()}
</main>

<FeedbackModal isAdmin={data.isAdmin} />

{#if data.pendingFeedback}
	<MeetingFeedbackModal
		formId={data.pendingFeedback.formId}
		meetingId={data.pendingFeedback.meetingId}
		initialState={data.pendingFeedback.state}
		vocabulary={data.pendingFeedback.vocabulary}
		meetingContext={data.pendingFeedback.meetingContext}
	/>
{/if}

<style>
	.main-content {
		min-height: 100vh;
		background: var(--bg-canvas);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>

<script lang="ts">
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import MeetingFeedbackModal from '$lib/components/MeetingFeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
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

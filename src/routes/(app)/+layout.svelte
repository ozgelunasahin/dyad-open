<script lang="ts">
	import type { LayoutData } from './$types';
	import MeetingFeedbackModal from '$lib/components/MeetingFeedbackModal.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<main class="main-content">
	{@render children()}
</main>

<!-- Authenticated-only: /api/feedback/app requires auth, so the button
	lives here rather than on the root layout. Pre-auth surfaces (landing,
	/login, /signup, /join, /waitlist) deliberately have no feedback path. -->
<FeedbackModal />

{#if data.pendingFeedback}
	<MeetingFeedbackModal
		formId={data.pendingFeedback.formId}
		meetingId={data.pendingFeedback.meetingId}
		initialState={data.pendingFeedback.state}
		vocabulary={data.pendingFeedback.vocabulary}
		meetingContext={data.pendingFeedback.meetingContext}
		lapsed={data.membership !== null && !data.membership.active}
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

<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cancelling = $state(false);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	async function handleCancel() {
		if (!confirm('Are you sure you want to cancel this meeting?')) return;
		cancelling = true;
		try {
			const res = await fetch(`/api/meetings/${data.meeting.id}/cancel`, { method: 'POST' });
			if (res.ok) goto('/profile');
		} finally {
			cancelling = false;
		}
	}
</script>

<svelte:head>
	<title>Meeting - dyad.berlin</title>
</svelte:head>

<div class="content">
	<a href="/profile" class="back-link">← Back</a>
	<h1 class="page-title">Meeting details</h1>

	<div class="detail-grid">
		<div class="detail-row">
			<span class="label">When</span>
			<span class="value">{formatDate(data.meeting.scheduled_time)}</span>
		</div>
		<div class="detail-row">
			<span class="label">Duration</span>
			<span class="value">{data.meeting.duration_minutes} minutes</span>
		</div>
		<div class="detail-row">
			<span class="label">Area</span>
			<span class="value">{data.meeting.general_area ?? 'TBD'}</span>
		</div>
		{#if 'exact_location' in data.meeting && data.meeting.exact_location}
			<div class="detail-row">
				<span class="label">Location</span>
				<span class="value location">{data.meeting.exact_location.name}<br /><span class="addr">{data.meeting.exact_location.address}</span></span>
			</div>
		{/if}
	</div>

	{#if data.meeting.state === 'scheduled' || data.meeting.state === 'active'}
		<button class="cancel-btn" onclick={handleCancel} disabled={cancelling}>
			{cancelling ? 'Cancelling...' : 'Cancel meeting'}
		</button>
	{/if}
</div>

<style>
	/* .back-link uses global shared class */
	.content { width: 100%; max-width: 560px; }

	.page-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-8); }

	.detail-grid { display: flex; flex-direction: column; margin-bottom: var(--space-8); }
	.detail-row { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.label { font-size: var(--text-sm); color: var(--text-muted); width: 80px; flex-shrink: 0; }
	.value { font-size: var(--text-base); }
	.location { font-weight: 500; }
	.addr { font-size: var(--text-xs); color: var(--text-muted); font-weight: normal; }

	.cancel-btn { font-size: var(--text-sm); padding: var(--space-2) var(--space-5); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: none; color: var(--text-muted); cursor: pointer; }
	.cancel-btn:hover { border-color: var(--color-danger); color: var(--color-danger); }
	.cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

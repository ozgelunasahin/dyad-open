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
	.content { width: 100%; max-width: 560px; }

	.page-title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.5rem; font-weight: normal; color: var(--text-primary); margin: 0 0 32px; }

	.detail-grid { display: flex; flex-direction: column; gap: 0; margin-bottom: 32px; }
	.detail-row { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06)); }
	.label { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; color: var(--text-muted, #666); width: 80px; flex-shrink: 0; }
	.value { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: var(--text-primary); }
	.location { font-weight: 500; }
	.addr { font-size: 12px; color: var(--text-muted, #666); font-weight: normal; }

	.cancel-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 8px 20px; border: 1px solid var(--border-link, rgba(0,0,0,0.15)); border-radius: 6px; background: none; color: var(--text-muted, #666); cursor: pointer; }
	.cancel-btn:hover { border-color: #c00; color: #c00; }
	.cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

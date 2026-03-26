<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt, Meeting } from '$lib/domain/types';

	let { data }: { data: PageData } = $props();

	type Tab = 'draft' | 'published' | 'archived';
	let activeTab = $state<Tab>('draft');

	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	let filteredPrompts = $derived(
		activeTab === 'draft' ? drafts :
		activeTab === 'published' ? published :
		archived
	);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Profile - dyad.berlin</title>
</svelte:head>

<div class="content">
	<h1 class="page-title">My prompts</h1>

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'draft'} onclick={() => activeTab = 'draft'}>
			Drafts ({drafts.length})
		</button>
		<button class="tab" class:active={activeTab === 'published'} onclick={() => activeTab = 'published'}>
			Published ({published.length})
		</button>
		<button class="tab" class:active={activeTab === 'archived'} onclick={() => activeTab = 'archived'}>
			Archived ({archived.length})
		</button>
	</div>

	<div class="prompt-list">
		{#each filteredPrompts as prompt (prompt.id)}
			<a
				href={prompt.state === 'draft' ? `/prompts/${prompt.id}/edit` : `/prompts/${prompt.id}`}
				class="prompt-card"
			>
				<div class="card-header">
					<h3 class="card-title">{prompt.title || 'Untitled'}</h3>
					<span class="badge badge-{prompt.state}">{prompt.state}</span>
				</div>
				<span class="card-date">{formatDate(prompt.updated_at)}</span>
			</a>
		{:else}
			<div class="empty-state">
				{#if activeTab === 'draft'}
					<p>No drafts yet.</p>
					<a href="/prompts/new" class="cta-link">Start a new prompt</a>
				{:else if activeTab === 'published'}
					<p>No published prompts.</p>
				{:else}
					<p>No archived prompts.</p>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Upcoming meetings -->
	{#if data.meetings.length > 0}
		<section class="meetings-section">
			<h2 class="section-title">Upcoming meetings</h2>
			{#each data.meetings as meeting}
				<a href="/meetings/{meeting.id}" class="meeting-card">
					<span class="meeting-time">{formatDate(meeting.scheduled_time)}</span>
					<span class="meeting-duration">{meeting.duration_minutes} min</span>
				</a>
			{/each}
		</section>
	{/if}
</div>

<style>
	.content { width: 100%; max-width: 700px; }

	.page-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 24px;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.1));
		margin-bottom: 24px;
	}

	.tab {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 16px;
		border: none;
		background: none;
		color: var(--text-muted, #666);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover { color: var(--text-primary); }
	.tab.active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

	.prompt-list { display: flex; flex-direction: column; gap: 0; }

	.prompt-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}

	.prompt-card:hover { opacity: 0.7; }

	.card-header { display: flex; align-items: center; gap: 10px; }

	.card-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.95rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0;
	}

	.badge {
		font-family: 'SF Mono', monospace;
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.badge-draft { background: rgba(0,0,0,0.06); color: var(--text-muted, #666); }
	.badge-published { background: rgba(61,158,90,0.12); color: #2d7a42; }
	.badge-archived { background: rgba(0,0,0,0.04); color: var(--text-muted, #999); }

	.card-date {
		font-family: 'SF Mono', monospace;
		font-size: 11px;
		color: var(--text-muted, #999);
		flex-shrink: 0;
	}

	.empty-state {
		padding: 40px 0;
		text-align: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		color: var(--text-muted, #999);
	}

	.cta-link {
		display: inline-block;
		margin-top: 12px;
		font-size: 14px;
		color: var(--text-primary);
		text-decoration: underline;
	}

	.meetings-section {
		margin-top: 48px;
		padding-top: 32px;
		border-top: 1px solid var(--border-link, rgba(0,0,0,0.08));
	}

	.section-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.1rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 16px;
	}

	.meeting-card {
		display: flex;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
		text-decoration: none;
		color: var(--text-primary);
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
	}

	.meeting-time { font-weight: 500; }
	.meeting-duration { color: var(--text-muted, #666); }
</style>

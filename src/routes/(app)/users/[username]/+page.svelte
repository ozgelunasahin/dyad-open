<script lang="ts">
	import type { PageData } from './$types';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { data }: { data: PageData } = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="content">
	<div class="profile-header">
		{#if data.profile.display_name}
			<h1 class="display-name">{data.profile.display_name}</h1>
			<p class="username">@{data.profile.username}</p>
		{:else}
			<h1 class="display-name">@{data.profile.username}</h1>
		{/if}
	</div>

	{#if data.prompts.length === 0}
		<p class="empty">No conversations yet.</p>
	{:else}
		<div class="prompt-list">
			{#each data.prompts as prompt}
				<a href="/conversations/{prompt.id}" class="prompt-row">
					<div class="row-thumb">
						{#if prompt.cover_image_url}
							<img src={prompt.cover_image_url} alt="" class="thumb-img" />
						{:else}
							<div class="thumb-placeholder"></div>
						{/if}
					</div>
					<div class="row-body">
						<h3 class="row-title">{prompt.title ?? 'Untitled'}</h3>
						<span class="row-date">{formatDate(prompt.published_at)}</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Back lives in the nav pill (variant="detail"), like every detail surface. -->
<FloatingNav variant="detail" attentionCount={data.attentionCount ?? 0} />

<style>
	.content {
		width: 100%;
		max-width: var(--content-standard);
		padding-bottom: var(--nav-clearance);
	}

	.profile-header { margin-bottom: var(--space-8); }
	.display-name { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-1); }
	.username { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	.empty { color: var(--text-muted); font-size: var(--text-base); }

	.prompt-list { display: flex; flex-direction: column; }

	.prompt-row {
		display: flex;
		gap: var(--space-4);
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}
	.prompt-row:last-child { border-bottom: none; }
	.prompt-row:hover { opacity: var(--opacity-hover-card); }

	.row-thumb {
		flex-shrink: 0;
		width: 72px;
		height: 72px;
		border-radius: var(--radius-input);
		overflow: hidden;
		position: relative;
	}
	.thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.thumb-placeholder { position: absolute; inset: 0; background: var(--bg-control); border: 1px solid var(--border-link); border-radius: inherit; }

	.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: var(--space-1); }
	.row-title { margin: 0; font-size: var(--text-md); font-weight: 500; }
	.row-date { font-size: var(--text-sm); color: var(--text-muted); }
</style>

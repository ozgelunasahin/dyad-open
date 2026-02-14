<script lang="ts">
	import SiteSPA from '$lib/components/SiteSPA.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let publishError = $state<string | null>(null);

	async function publish() {
		if (!data.sections || data.sections.length === 0) {
			publishError = 'Add at least one section before publishing';
			return;
		}

		try {
			const res = await fetch(`/api/sites/${data.site.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_published: true })
			});

			if (!res.ok) {
				const result = await res.json();
				publishError = result.error || 'Failed to publish';
				return;
			}

			window.location.href = `/sites/@${data.username}/${data.site.slug}`;
		} catch {
			publishError = 'Failed to publish';
		}
	}
</script>

<svelte:head>
	<title>preview: {data.site.name} - dyad. cultivating a culture of conversation</title>
</svelte:head>

<div class="preview-page">
	<div class="preview-banner">
		<span class="preview-label">Preview Mode</span>
		<div class="banner-actions">
			<a href="/sites/{data.site.slug}/edit" class="banner-btn">Back to Edit</a>
			{#if data.site.is_published}
				<a href="/sites/@{data.username}/{data.site.slug}" class="banner-btn published">
					View Published
				</a>
			{:else}
				<button class="banner-btn publish" onclick={publish}>Publish</button>
			{/if}
		</div>
	</div>

	{#if publishError}
		<div class="error-banner">{publishError}</div>
	{/if}

	{#if !data.sections || data.sections.length === 0}
		<div class="empty-state">
			<p>No sections in this site yet.</p>
			<a href="/sites/{data.site.slug}/edit">Add sections in the editor</a>
		</div>
	{:else}
		<SiteSPA
			sections={data.sections}
			navItems={data.navItems}
			siteName={data.site.name}
		/>
	{/if}
</div>

<style>
	.preview-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.preview-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: #fef3cd;
		border-bottom: 1px solid #ffc107;
		flex-shrink: 0;
		z-index: 200;
	}

	.preview-label {
		font-weight: 500;
		color: #856404;
	}

	.banner-actions {
		display: flex;
		gap: 0.75rem;
	}

	.banner-btn {
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.banner-btn:hover {
		opacity: 0.9;
	}

	a.banner-btn {
		background: white;
		border: 1px solid #ccc;
		color: #333;
	}

	button.banner-btn.publish {
		background: #28a745;
		border: none;
		color: white;
	}

	a.banner-btn.published {
		background: #17a2b8;
		border: none;
		color: white;
	}

	.error-banner {
		background: rgba(220, 53, 69, 0.1);
		border-bottom: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.5rem 1.5rem;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		gap: 1rem;
	}

	.empty-state a {
		color: var(--text-link);
	}
</style>

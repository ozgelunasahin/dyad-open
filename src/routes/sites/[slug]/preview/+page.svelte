<script lang="ts">
	import { onMount, tick } from 'svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import type { CanvasSectionData } from '$lib/server/load-site-sections';

	let { data }: { data: PageData } = $props();

	let publishError = $state<string | null>(null);
	let scrollContainer = $state<HTMLElement>(null!);
	let sectionEls: Record<string, HTMLElement> = {};
	let activeSlug = $state('');
	let exploringSection = $state<string | null>(null);
	let lastScrollY = $state(0);

	// Contact form state
	let contactStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let contactEmail = $state('');
	let contactName = $state('');

	function getSectionSlug(section: { type: string; sectionId?: string; id?: string }) {
		return section.type === 'canvas'
			? (section.sectionId ?? '')
			: (section.id ?? '');
	}

	onMount(() => {
		if (data.sections?.length > 0) {
			activeSlug = getSectionSlug(data.sections[0]);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
						const slug = entry.target.getAttribute('data-section-slug');
						if (slug) activeSlug = slug;
					}
				}
			},
			{ root: scrollContainer, threshold: 0.5 }
		);

		for (const el of Object.values(sectionEls)) {
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	});

	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		const y = target.scrollTop;
		lastScrollY = y;
	}

	function handleNavClick(slug: string) {
		const el = sectionEls[slug];
		if (el) el.scrollIntoView({ behavior: 'smooth' });
	}

	function scrollToSection(slug: string) {
		const el = sectionEls[slug];
		if (!el || !scrollContainer) return;
		scrollContainer.style.scrollSnapType = 'none';
		el.scrollIntoView({ block: 'start' });
		requestAnimationFrame(() => {
			if (scrollContainer) scrollContainer.style.scrollSnapType = '';
		});
	}

	async function enterExploreMode(section: CanvasSectionData & { type: 'canvas' }) {
		exploringSection = section.sectionId;
		canvasStore.initialize(section.vault, `site-${section.canvasId}`, section.cardPositions);
		await tick();
		scrollToSection(section.sectionId);
	}

	async function exitExploreMode() {
		const slug = exploringSection;
		exploringSection = null;
		canvasStore.teardown();
		await tick();
		if (slug) scrollToSection(slug);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && exploringSection) {
			exitExploreMode();
			return;
		}

		if (!exploringSection && data.sections) {
			const slugs = data.sections.map(getSectionSlug);
			const currentIdx = slugs.indexOf(activeSlug);

			if (e.key === 'PageDown' || e.key === 'ArrowDown') {
				const nextIdx = Math.min(currentIdx + 1, slugs.length - 1);
				if (nextIdx !== currentIdx) {
					e.preventDefault();
					handleNavClick(slugs[nextIdx]);
				}
			} else if (e.key === 'PageUp' || e.key === 'ArrowUp') {
				const prevIdx = Math.max(currentIdx - 1, 0);
				if (prevIdx !== currentIdx) {
					e.preventDefault();
					handleNavClick(slugs[prevIdx]);
				}
			}
		}
	}

	async function handleContactSubmit(event: SubmitEvent) {
		event.preventDefault();
		contactStatus = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: contactEmail, name: contactName })
			});
			if (res.ok) {
				contactStatus = 'sent';
				contactEmail = '';
				contactName = '';
			} else {
				contactStatus = 'error';
			}
		} catch {
			contactStatus = 'error';
		}
	}

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
	<title>Preview: {data.site.name} - dyad.berlin</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

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
		<SiteNav
			items={data.navItems}
			{activeSlug}
			siteName={data.site.name}
			onNavigate={handleNavClick}
		/>

		<div
			class="scroll-container"
			bind:this={scrollContainer}
			onscroll={handleScroll}
		>
			{#each data.sections as section}
				{@const slug = getSectionSlug(section)}
				{@const isExploring = exploringSection === slug}

				<section
					class="snap-section"
					class:exploring={isExploring}
					data-section-slug={slug}
					bind:this={sectionEls[slug]}
				>
					{#if section.type === 'hero'}
						<div class="hero-section">
							<h1 class="hero-title">{section.config?.title || section.name}</h1>
							{#if section.config?.tagline}
								<p class="hero-tagline">{section.config.tagline}</p>
							{/if}
						</div>

					{:else if section.type === 'contact'}
						<div class="contact-section">
							<h2 class="contact-title">{section.config?.title || section.name}</h2>
							{#if contactStatus === 'sent'}
								<p class="contact-thanks">Thanks — we'll be in touch.</p>
							{:else}
								<form class="contact-form" onsubmit={handleContactSubmit}>
									<input type="text" bind:value={contactName} placeholder="Name" class="contact-input" />
									<input type="email" bind:value={contactEmail} placeholder="Email" required class="contact-input" />
									<button type="submit" class="contact-btn" disabled={contactStatus === 'sending'}>
										{contactStatus === 'sending' ? 'Sending...' : 'Stay in touch'}
									</button>
								</form>
								{#if contactStatus === 'error'}
									<p class="contact-error">Something went wrong.</p>
								{/if}
							{/if}
						</div>

					{:else if section.type === 'canvas'}
						{#if isExploring}
							<div class="canvas-explore" transition:fade={{ duration: 200 }}>
								<Canvas readOnly />
								<button class="explore-back" onclick={exitExploreMode} aria-label="Back to overview">
									<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
										<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
									</svg>
									Back to overview
								</button>
							</div>
						{:else}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="canvas-preview" onclick={() => enterExploreMode(section)}>
								<div class="preview-cards">
									{#each section.cardPositions as pos}
										{@const rendered = section.renderedNotes?.[pos.noteId]}
										{#if rendered}
											<div
												class="preview-card"
												style="left: {pos.x}px; top: {pos.y}px; width: {pos.width}px; height: {pos.height}px;"
											>
												<h3 class="preview-card-title">{rendered.title}</h3>
												<div class="preview-card-content">
													{@html rendered.html}
												</div>
											</div>
										{/if}
									{/each}
								</div>
								<div class="preview-vignette">
									<span class="explore-cta">Explore →</span>
								</div>
							</div>
						{/if}
					{/if}
				</section>
			{/each}
		</div>
	{/if}

	<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
		{#if themeStore.current === 'light'}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
				<path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		{:else}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>
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

	/* === Scroll-Snap Container === */
	.scroll-container {
		flex: 1;
		overflow-y: auto;
		scroll-snap-type: y mandatory;
		scroll-behavior: smooth;
	}

	.snap-section {
		min-height: 100%;
		scroll-snap-align: start;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		padding-top: 48px;
		content-visibility: auto;
		contain-intrinsic-size: auto 100vh;
	}

	.snap-section.exploring {
		scroll-snap-align: none;
	}

	/* === Hero Section === */
	.hero-section {
		text-align: center;
		max-width: 640px;
		padding: 2rem;
	}

	.hero-title {
		font-family: 'Georgia', serif;
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 1rem 0;
		letter-spacing: -0.02em;
		line-height: 1.15;
	}

	.hero-tagline {
		font-family: 'Georgia', serif;
		font-size: clamp(1rem, 2.5vw, 1.25rem);
		color: var(--text-muted, #8b7355);
		margin: 0;
		line-height: 1.6;
	}

	/* === Contact Section === */
	.contact-section {
		max-width: 400px;
		width: 100%;
		padding: 2rem;
	}

	.contact-title {
		font-family: 'Georgia', serif;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 1.5rem 0;
		text-align: center;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.contact-input {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border-link, #d4c9b8);
		border-radius: 4px;
		background: var(--bg-canvas, #faf9f6);
		color: var(--text-primary, #1a1a1a);
		font-size: 1rem;
		font-family: inherit;
	}

	.contact-input:focus {
		outline: none;
		border-color: var(--text-link, #8b7355);
	}

	.contact-btn {
		padding: 0.75rem 1.5rem;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #faf9f6);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	.contact-btn:disabled {
		opacity: 0.5;
	}

	.contact-thanks {
		color: var(--text-muted, #8b7355);
		font-style: italic;
		text-align: center;
	}

	.contact-error {
		color: #dc2626;
		font-size: 0.9rem;
		margin-top: 0.5rem;
		text-align: center;
	}

	/* === Canvas Preview (Static) === */
	.canvas-preview {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: calc(100vh - 48px);
		overflow: hidden;
		cursor: zoom-in;
	}

	.preview-cards {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-card {
		position: absolute;
		background: var(--bg-canvas, #faf9f6);
		border: 1px solid var(--border-link, rgba(139, 115, 85, 0.15));
		border-radius: 6px;
		padding: 16px 20px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.preview-card-title {
		font-family: 'Georgia', serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 8px 0;
		letter-spacing: -0.01em;
	}

	.preview-card-content {
		font-family: 'Georgia', serif;
		font-size: 12px;
		line-height: 1.6;
		color: var(--text-secondary, #4a4a4a);
		overflow: hidden;
	}

	.preview-vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 30%,
			rgba(250, 249, 246, 0.7) 70%,
			rgba(250, 249, 246, 0.95) 100%
		);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.explore-cta {
		font-family: 'Georgia', serif;
		font-size: 1.1rem;
		color: var(--text-muted, #8b7355);
		background: rgba(250, 249, 246, 0.85);
		padding: 10px 24px;
		border-radius: 6px;
		border: 1px solid rgba(139, 115, 85, 0.2);
		pointer-events: auto;
		transition: all 0.2s ease;
	}

	.canvas-preview:hover .explore-cta {
		color: var(--text-primary, #1a1a1a);
		border-color: rgba(139, 115, 85, 0.4);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}

	/* === Interactive Canvas Mode === */
	.canvas-explore {
		width: 100%;
		height: calc(100vh - 48px);
		position: relative;
	}

	.explore-back {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: rgba(250, 249, 246, 0.92);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(139, 115, 85, 0.2);
		border-radius: 6px;
		font-family: 'Georgia', serif;
		font-size: 13px;
		color: var(--text-muted, #8b7355);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.explore-back:hover {
		color: var(--text-primary, #1a1a1a);
		border-color: rgba(139, 115, 85, 0.4);
	}

	/* === Theme toggle === */
	.theme-toggle {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
		cursor: pointer;
		color: var(--control-color, #8b7355);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.4;
		z-index: 100;
	}

	.theme-toggle:hover {
		background: var(--bg-control-hover, rgba(0, 0, 0, 0.08));
		color: var(--control-color-hover, #1a1a1a);
		opacity: 1;
	}

	/* === Responsive === */
	@media (max-width: 768px) {
		.scroll-container {
			scroll-snap-type: y proximity;
		}
	}

	/* === Dark mode === */
	@media (prefers-color-scheme: dark) {
		.preview-vignette {
			background: radial-gradient(
				ellipse at center,
				transparent 30%,
				rgba(26, 26, 26, 0.7) 70%,
				rgba(26, 26, 26, 0.95) 100%
			);
		}

		.explore-cta {
			background: rgba(26, 26, 26, 0.85);
			border-color: rgba(139, 115, 85, 0.3);
		}

		.explore-back {
			background: rgba(26, 26, 26, 0.92);
			border-color: rgba(139, 115, 85, 0.3);
		}
	}

	/* === Reduced motion === */
	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>

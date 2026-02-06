<script lang="ts">
	import { onMount, tick } from 'svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let publishError = $state<string | null>(null);
	let scrollContainer = $state<HTMLElement>(null!);
	let sectionEls: Record<string, HTMLElement> = {};
	let activeSlug = $state('');
	let activeCanvasSection = $state<string | null>(null);
	let lastScrollY = $state(0);

	// Canvas activation timers (for debounced auto-activation)
	let activationTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

		// Nav section tracking observer
		const navObserver = new IntersectionObserver(
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

		// Canvas auto-activation observer
		const canvasObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const sectionId = entry.target.getAttribute('data-canvas-section');
					if (!sectionId) continue;

					if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
						if (!activationTimers.has(sectionId)) {
							const timer = setTimeout(() => {
								activationTimers.delete(sectionId);
								activateCanvas(sectionId);
							}, 300);
							activationTimers.set(sectionId, timer);
						}
					} else {
						const timer = activationTimers.get(sectionId);
						if (timer) {
							clearTimeout(timer);
							activationTimers.delete(sectionId);
						}
						if (activeCanvasSection === sectionId) {
							deactivateCanvas();
						}
					}
				}
			},
			{
				root: scrollContainer,
				threshold: [0, 0.3, 0.6, 1.0]
			}
		);

		for (const el of Object.values(sectionEls)) {
			if (el) navObserver.observe(el);
		}

		for (const section of data.sections ?? []) {
			if (section.type === 'canvas') {
				const el = sectionEls[getSectionSlug(section)];
				if (el) canvasObserver.observe(el);
			}
		}

		return () => {
			navObserver.disconnect();
			canvasObserver.disconnect();
			for (const timer of activationTimers.values()) clearTimeout(timer);
		};
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

	// --- Canvas auto-activation ---

	async function activateCanvas(sectionId: string) {
		if (activeCanvasSection === sectionId) return; // Already active

		const section = data.sections?.find(
			(s) => s.type === 'canvas' && s.sectionId === sectionId
		);
		if (!section || section.type !== 'canvas') return;

		if (activeCanvasSection && activeCanvasSection !== sectionId) {
			canvasStore.teardown();
		}

		activeCanvasSection = sectionId;
		canvasStore.initialize(section.vault, `site-${section.canvasId}`, section.cardPositions);
		await tick();

		if (scrollContainer) scrollContainer.style.scrollSnapType = 'none';
	}

	function deactivateCanvas() {
		activeCanvasSection = null;
		canvasStore.teardown();

		if (scrollContainer) {
			requestAnimationFrame(() => {
				if (scrollContainer) scrollContainer.style.scrollSnapType = '';
			});
		}
	}

	// Canvas boundary exit → scroll to next/previous section
	function handleBoundaryExit(direction: 'up' | 'down') {
		if (!data.sections) return;
		const slugs = data.sections.map(getSectionSlug);
		const currentIdx = slugs.indexOf(activeSlug);
		if (currentIdx === -1) return;

		const targetIdx =
			direction === 'down'
				? Math.min(currentIdx + 1, slugs.length - 1)
				: Math.max(currentIdx - 1, 0);

		if (targetIdx !== currentIdx) {
			deactivateCanvas();
			handleNavClick(slugs[targetIdx]);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (data.sections) {
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
				{@const isCanvasActive = activeCanvasSection === slug}

				<section
					class="snap-section"
					class:canvas-active={isCanvasActive}
					data-section-slug={slug}
					data-canvas-section={section.type === 'canvas' ? section.sectionId : undefined}
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
						{#if isCanvasActive}
							<div class="canvas-frame" transition:fade={{ duration: 200 }}>
								<Canvas readOnly onBoundaryExit={handleBoundaryExit} />
							</div>
						{:else}
							<div class="canvas-placeholder">
								<h2 class="placeholder-title">{section.navLabel || section.name}</h2>
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

	.snap-section.canvas-active {
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

	/* === Canvas Frame (interactive, bounded) === */
	.canvas-frame {
		width: 100%;
		height: calc(100vh - 48px);
		position: relative;
		overflow: hidden;
		touch-action: none;
		overscroll-behavior: contain;
	}

	/* === Canvas Placeholder (shown when canvas not active) === */
	.canvas-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: calc(100vh - 48px);
		color: var(--text-muted, #8b7355);
	}

	.placeholder-title {
		font-family: 'Georgia', serif;
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 0;
		opacity: 0.4;
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

	/* === Reduced motion === */
	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>

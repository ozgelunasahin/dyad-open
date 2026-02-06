<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import Canvas from '$lib/components/Canvas.svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { SectionData } from '$lib/server/load-site-sections';

	interface NavItem {
		slug: string;
		name: string;
		type: string;
	}

	interface Props {
		sections: SectionData[];
		navItems: NavItem[];
		siteName: string;
		fullHeight?: boolean;
		header?: Snippet;
	}

	let { sections, navItems, siteName, fullHeight = false, header }: Props = $props();

	// --- Scroll / section state ---
	let scrollContainer: HTMLElement | null = $state(null);
	let sectionEls: Record<string, HTMLElement> = {};
	let activeSlug = $state('');
	let activeCanvasSection = $state<string | null>(null);
	let navHidden = $state(false);
	let lastScrollY = 0;

	// Generation counter prevents stale async canvas activation
	let activationGeneration = 0;

	// Contact form state
	let contactStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let contactEmail = $state('');
	let contactName = $state('');

	// --- Helpers ---

	function getSectionSlug(section: { type: string; sectionId?: string; id?: string }) {
		return section.type === 'canvas'
			? (section.sectionId ?? '')
			: (section.id ?? '');
	}

	// Set initial active section
	$effect(() => {
		if (activeSlug === '' && sections?.length > 0) {
			activeSlug = getSectionSlug(sections[0]);
		}
	});

	// IntersectionObserver in $effect so bind:this refs are populated
	$effect(() => {
		if (!scrollContainer) return;

		const els = Object.values(sectionEls).filter(Boolean);
		if (els.length === 0) return;

		const navObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
						const slug = entry.target.getAttribute('data-section-slug');
						if (slug) activeSlug = slug;
					}
				}
			},
			{
				root: scrollContainer,
				threshold: 0.5
			}
		);

		for (const el of els) {
			navObserver.observe(el);
		}

		return () => {
			navObserver.disconnect();
		};
	});

	// Canvas auto-activation: react to activeSlug changes
	$effect(() => {
		if (!sections) return;

		const currentSection = sections.find((s) => getSectionSlug(s) === activeSlug);

		if (currentSection?.type === 'canvas' && currentSection.sectionId) {
			activateCanvas(currentSection.sectionId);
		} else if (activeCanvasSection) {
			deactivateCanvas();
		}
	});

	// --- Event handlers ---

	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		const y = target.scrollTop;
		if (y > lastScrollY && y > 80) {
			navHidden = true;
		} else if (y < lastScrollY) {
			navHidden = false;
		}
		lastScrollY = y;
	}

	function handleNavClick(slug: string) {
		const el = sectionEls[slug];
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (sections) {
			const slugs = sections.map(getSectionSlug);
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

	// --- Canvas lifecycle ---

	async function activateCanvas(sectionId: string) {
		if (activeCanvasSection === sectionId) return;

		const myGeneration = ++activationGeneration;

		const section = sections?.find(
			(s) => s.type === 'canvas' && s.sectionId === sectionId
		);
		if (!section || section.type !== 'canvas') return;

		// Suspend previous canvas (snapshot state for fast resume later)
		if (activeCanvasSection && activeCanvasSection !== sectionId) {
			canvasStore.suspend();
		}

		activeCanvasSection = sectionId;
		const canvasStoreId = `site-${section.canvasId}`;
		const resumed = canvasStore.resume(canvasStoreId);
		if (!resumed) {
			canvasStore.initialize(section.vault, canvasStoreId, section.cardPositions);
		}
		await tick();

		if (activationGeneration !== myGeneration) return;

		if (scrollContainer) scrollContainer.style.scrollSnapType = 'none';
	}

	function deactivateCanvas() {
		activationGeneration++;
		activeCanvasSection = null;
		canvasStore.suspend();

		if (scrollContainer) {
			requestAnimationFrame(() => {
				if (scrollContainer && activeCanvasSection === null) {
					scrollContainer.style.scrollSnapType = '';
				}
			});
		}
	}

	function handleBoundaryExit(direction: 'up' | 'down') {
		if (!sections) return;
		const slugs = sections.map(getSectionSlug);
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

	// --- Contact form ---

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if header}
	{@render header()}
{/if}

<SiteNav
	items={navItems}
	{activeSlug}
	{siteName}
	hidden={navHidden}
	onNavigate={handleNavClick}
/>

<div
	class="scroll-container"
	class:full-height={fullHeight}
	bind:this={scrollContainer}
	onscroll={handleScroll}
>
	{#each sections as section}
		{@const slug = getSectionSlug(section)}
		{@const isCanvasActive = activeCanvasSection === slug}

		<section
			class="snap-section"
			class:canvas-active={isCanvasActive}
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

<style>
	/* === Scroll-Snap Container === */
	.scroll-container {
		flex: 1;
		overflow-y: auto;
		scroll-snap-type: y mandatory;
		scroll-behavior: smooth;
	}

	.scroll-container.full-height {
		height: 100vh;
	}

	.snap-section {
		min-height: 100vh;
		scroll-snap-align: start;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		padding-top: 48px; /* nav height */
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
		width: calc(100% - 128px);
		height: calc(100vh - 176px);
		margin: 64px;
		position: relative;
		overflow: hidden;
		touch-action: none;
		overscroll-behavior: contain;
		border-radius: 16px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
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
			/* Use proximity on mobile to avoid fast-flick trapping */
			scroll-snap-type: y proximity;
		}

		.snap-section {
			padding-top: 48px;
		}

		.hero-section {
			padding: 1.5rem;
		}

		.contact-section {
			padding: 1.5rem;
		}
	}

	/* === Reduced motion === */
	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>

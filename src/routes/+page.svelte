<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';

	let { data } = $props();

	// Scroll and section state
	let scrollContainer: HTMLElement | null = $state(null);
	let sectionEls: Record<string, HTMLElement> = {};
	let activeSlug = $state('');
	let activeCanvasSection = $state<string | null>(null);
	let navHidden = $state(false);
	let lastScrollY = 0;

	// Generation counter prevents stale async canvas activation
	let activationGeneration = 0;

	// Set initial active section
	$effect(() => {
		if (activeSlug === '' && data.sections?.length > 0) {
			activeSlug = data.sections[0].sectionId ?? '';
		}
	});

	// IntersectionObserver to track active section
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
		if (!data.sections) return;

		const currentSection = data.sections.find((s) => s.sectionId === activeSlug);

		if (currentSection?.type === 'canvas' && currentSection.sectionId) {
			activateCanvas(currentSection.sectionId);
		} else if (activeCanvasSection) {
			deactivateCanvas();
		}
	});

	// Event handlers
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
		if (data.sections) {
			const slugs = data.sections.map(s => s.sectionId ?? '');
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

	// Canvas lifecycle
	async function activateCanvas(sectionId: string) {
		if (activeCanvasSection === sectionId) return;

		const myGeneration = ++activationGeneration;

		const section = data.sections?.find(
			(s) => s.type === 'canvas' && s.sectionId === sectionId
		);
		if (!section || section.type !== 'canvas') return;

		// Suspend previous canvas (snapshot state for fast resume later)
		if (activeCanvasSection && activeCanvasSection !== sectionId) {
			canvasStore.suspend();
		}

		activeCanvasSection = sectionId;
		const canvasStoreId = `landing-${section.canvasId}`;
		// Always initialize fresh on landing page (don't resume from cache)
		// This ensures users see the latest published content
		canvasStore.initialize(section.vault, canvasStoreId, section.cardPositions);
		await tick();

		if (activationGeneration !== myGeneration) return;
	}

	function deactivateCanvas() {
		activationGeneration++;
		activeCanvasSection = null;
		canvasStore.suspend();
	}

	function handleBoundaryExit(direction: 'up' | 'down') {
		if (!data.sections) return;
		const slugs = data.sections.map(s => s.sectionId ?? '');
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
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>dyad.berlin — social civic infrastructure</title>
	<meta name="description" content="Social civic infrastructure for community bridging in Berlin." />
</svelte:head>

{#if data.sections && data.sections.length > 0}
	<SiteNav
		items={data.navItems}
		activeSlug={activeSlug}
		siteName="dyad.berlin"
		hidden={navHidden}
		onNavigate={handleNavClick}
	/>

	<div
		class="scroll-container"
		bind:this={scrollContainer}
		onscroll={handleScroll}
	>
		{#each data.sections as section}
			{@const slug = section.sectionId ?? ''}
			{@const isCanvasActive = activeCanvasSection === slug}

			<section
				class="snap-section"
				data-section-slug={slug}
				bind:this={sectionEls[slug]}
			>
				{#if section.type === 'canvas'}
					<div class="section-card">
						{#if section.coverImageUrl}
							<img class="section-bg" src={section.coverImageUrl} alt="" />
						{/if}
						{#if isCanvasActive}
							<div class="canvas-frame" transition:fade={{ duration: 300 }}>
								<Canvas readOnly captureWheel={false} onBoundaryExit={handleBoundaryExit} />
							</div>
						{:else}
							<div class="canvas-placeholder"></div>
						{/if}
					</div>
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
{:else}
	<!-- Fallback -->
	<div class="fallback">
		<h1 class="splash-logo">dyad.berlin</h1>
		<p class="splash-tagline">Social civic infrastructure for Berlin</p>
	</div>
{/if}

<style>
	/* === Scroll-Snap Container === */
	.scroll-container {
		height: 100vh;
		overflow-y: auto;
		scroll-behavior: smooth;
		scroll-snap-type: y mandatory;
	}

	.snap-section {
		height: 100vh;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		box-sizing: border-box;
		overflow: hidden;
	}

	/* === Section Card (positioning context for bg + canvas) === */
	.section-card {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	/* Cover image — fills the entire section as background */
	.section-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Canvas frame — nested within the background, bottom 25% */
	.section-card .canvas-frame {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 25vh;
		border-radius: 0;
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		z-index: 1;
	}

	/* Hide duplicate image inside canvas */
	.section-card :global(.canvas img) {
		display: none !important;
	}

	/* === Canvas Placeholder (shown when canvas not active) === */
	.canvas-placeholder {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 25vh;
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

	/* Fallback */
	.fallback {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-canvas);
		color: var(--text-primary);
		padding: 2rem;
		text-align: center;
	}

	.splash-logo {
		font-family: 'Georgia', serif;
		font-size: 2.5rem;
		font-weight: normal;
		margin: 0 0 0.75rem 0;
	}

	.splash-tagline {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0;
	}

	/* === Responsive === */
	@media (max-width: 768px) {
		.section-card .canvas-frame {
			height: 30vh;
		}
	}

	/* === Reduced motion === */
	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>

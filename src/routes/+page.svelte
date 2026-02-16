<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import ExpandableContent from '$lib/components/ExpandableContent.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import FieldNotesSection from '$lib/components/FieldNotesSection.svelte';
	import JoinSection from '$lib/components/JoinSection.svelte';

	let { data } = $props();

	// Mobile detection
	let isMobile = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;
		const mqHandler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
		mq.addEventListener('change', mqHandler);
		return () => mq.removeEventListener('change', mqHandler);
	});

	// Scroll and section state
	let scrollContainer: HTMLElement | null = $state(null);
	let sectionEls: Record<string, HTMLElement> = $state({});
	let activeSlug = $state('');
	let activeCanvasSection = $state<string | null>(null);
	let navHidden = $state(false);
	let lastScrollY = 0;

	// Generation counter prevents stale async canvas activation
	let activationGeneration = 0;

	// Canvas expand/fullscreen state
	let expandedCanvas = $state<string | null>(null);

	function toggleExpand(slug: string) {
		expandedCanvas = expandedCanvas === slug ? null : slug;
	}

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

	// Canvas auto-activation: only on desktop
	$effect(() => {
		if (isMobile || !data.sections) return;

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

	// Canvas lifecycle — desktop only
	async function activateCanvas(sectionId: string) {
		if (isMobile) return;
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
	<title>dyad. cultivating a culture of conversation</title>
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
						<div class="canvas-area" class:expanded={expandedCanvas === slug}>
							{#if slug !== 'dyad'}<span class="section-tag">{section.name}</span>{/if}
							{#if isMobile}
								{@const entryNote = section.vault?.notes?.[section.vault?.entryPoint]}
								{#if entryNote}
									<div class="mobile-entry-text">
										<ExpandableContent
											content={entryNote.content}
											vault={section.vault}
										/>
									</div>
								{/if}
							{:else}
								{#if isCanvasActive}
									<div class="canvas-frame" transition:fade={{ duration: 300 }}>
										<Canvas readOnly captureWheel={false} onBoundaryExit={handleBoundaryExit} />
									</div>
								{/if}
								<button class="expand-btn" onclick={() => toggleExpand(slug)} aria-label={expandedCanvas === slug ? 'Collapse canvas' : 'Expand canvas'}>
									{#if expandedCanvas === slug}
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
											<path d="M9 1h4v4M5 13H1V9M13 1L8.5 5.5M1 13l4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									{:else}
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
											<path d="M1 5V1h4M13 9v4H9M1 1l4.5 4.5M13 13L8.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									{/if}
								</button>
							{/if}
						</div>
						{#if section.coverImageUrl}
							<div class="section-cover">
								{#if /\.(mp4|webm|mov)(\?|$)/i.test(section.coverImageUrl)}
									<video src={section.coverImageUrl} autoplay loop muted playsinline></video>
								{:else}
									<img src={section.coverImageUrl} alt="" />
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</section>
		{/each}

		<!-- Field Notes + Footer section -->
		{#if data.highlights && data.highlights.length > 0 || data.isEditMode}
			<section
				class="snap-section field-notes-section"
				data-section-slug="field-notes"
				bind:this={sectionEls['field-notes']}
			>
				<FieldNotesSection highlights={data.highlights || []} isEditMode={data.isEditMode} />
				<JoinSection />
				<div class="footer-area">
					<SiteFooter />
				</div>
			</section>
		{:else}
			<section class="snap-section footer-only-section">
				<div class="footer-area">
					<SiteFooter />
				</div>
			</section>
		{/if}
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
		min-height: 100vh;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		display: flex;
		flex-direction: column;
		position: relative;
		box-sizing: border-box;
	}

	/* === Section Card — horizontal split: canvas left, image right === */
	.section-card {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: row;
		overflow: hidden;
	}

	/* Cover image — right half with grain overlay */
	.section-cover {
		width: 50%;
		height: 100%;
		position: relative;
		padding: 16px 16px 16px 0;
		box-sizing: border-box;
	}

	.section-cover img,
	.section-cover video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		border-radius: 8px;
	}

	/* Film grain overlay — matches image inset */
	.section-cover::after {
		content: '';
		position: absolute;
		top: 16px;
		right: 16px;
		bottom: 16px;
		left: 0;
		border-radius: 8px;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
		background-size: 128px 128px;
		mix-blend-mode: overlay;
		pointer-events: none;
		z-index: 1;
	}

	/* Section tag — monospace label above canvas content */
	.section-tag {
		font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted, #666);
		position: absolute;
		top: 40px;
		left: 32px;
		z-index: 4;
	}

	/* Canvas/text area — left half */
	.canvas-area {
		width: 50%;
		height: 100%;
		position: relative;
		overflow: hidden;
		transition: width 0.6s ease;
	}

	/* When expanded, canvas takes the full section */
	.canvas-area.expanded {
		width: 100%;
		position: absolute;
		inset: 0;
		z-index: 3;
	}

	.canvas-frame {
		width: 100%;
		height: 100%;
		overflow: hidden;
		touch-action: none;
	}

	/* Mobile entry text — replaces canvas on mobile */
	.mobile-entry-text {
		width: 100%;
		background: var(--bg-canvas);
		padding: 16px 14px 80px;
		box-sizing: border-box;
	}

	/* Expand/collapse button */
	.expand-btn {
		position: absolute;
		bottom: 16px;
		right: 16px;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.5);
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		transition: background 0.15s, color 0.15s;
	}

	.expand-btn:hover {
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
	}

	/* Hide duplicate image inside canvas */
	.section-card :global(.canvas img) {
		display: none !important;
	}

	/* === Theme toggle === */
	.theme-toggle {
		position: fixed;
		bottom: 24px;
		left: 24px;
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
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 2.5rem;
		font-weight: normal;
		margin: 0 0 0.75rem 0;
	}

	.splash-tagline {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0;
	}

	/* === Field Notes section === */
	.field-notes-section {
		background: var(--bg-canvas);
		height: auto;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.footer-only-section {
		background: var(--bg-canvas);
		display: flex;
		align-items: flex-end;
	}

	.footer-area {
		margin-top: auto;
		width: 100%;
	}

	/* === Mobile — free-scrolling article layout === */
	@media (max-width: 768px) {
		.scroll-container {
			scroll-snap-type: none;
		}

		.snap-section {
			height: auto;
			min-height: 0;
			scroll-snap-align: none;
			scroll-snap-stop: normal;
		}

		.section-card {
			height: auto;
			flex-direction: column-reverse;
			overflow: visible;
		}

		.section-cover {
			width: 100%;
			height: 70vh;
			padding: 0;
		}

		.section-cover img,
		.section-cover video {
			border-radius: 0;
		}

		.section-cover::after {
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			border-radius: 0;
		}

		.canvas-area {
			width: 100%;
			position: relative;
			height: auto;
		}

		.section-tag {
			position: static;
			display: block;
			padding: 16px 14px 0;
		}

		.mobile-entry-text {
			padding: 16px 14px 40px;
		}

		.field-notes-section {
			min-height: auto;
			scroll-snap-align: none;
			padding: 40px 0;
		}

		.footer-section {
			padding-top: 40px;
		}
	}

	/* === Reduced motion === */
	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>

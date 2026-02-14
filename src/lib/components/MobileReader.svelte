<script lang="ts">
	import { onMount } from 'svelte';
	import MobileReaderPage from '$lib/components/MobileReaderPage.svelte';
	import type { Vault } from '$lib/types';

	interface Props {
		vault: Vault;
		initialNoteId?: string;
		onClose?: () => void;
	}

	let { vault, initialNoteId, onClose }: Props = $props();

	// Navigation stack — array of note IDs
	let stack = $state<string[]>([]);
	let currentNoteId = $derived(stack[stack.length - 1] ?? '');
	let currentNote = $derived(currentNoteId ? vault.notes[currentNoteId] : null);
	let previousNote = $derived(stack.length > 1 ? vault.notes[stack[stack.length - 2]] : null);

	// Animation state
	let animationDirection = $state<'forward' | 'back' | 'none'>('none');
	let isAnimating = $state(false);

	// Swipe gesture state
	let swipeOffset = $state(0);
	let isSwiping = $state(false);
	let touchStartX = 0;
	let touchStartY = 0;
	let touchStartTime = 0;
	let isSwipeGesture = false; // Determined after initial movement
	let gestureDecided = false;

	// DOM refs
	let viewportEl: HTMLElement | null = $state(null);
	let overlayEl: HTMLElement | null = $state(null);

	// Reduced motion preference
	let prefersReducedMotion = $state(false);

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Initialize stack with the initial note
		const startId = initialNoteId || vault.entryPoint;
		if (startId && vault.notes[startId]) {
			stack = [startId];
		}

		// Prevent body scroll while overlay is open
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function isLinkBroken(target: string): boolean {
		return !vault.notes[target];
	}

	function navigateForward(noteId: string) {
		if (isAnimating || !vault.notes[noteId]) return;

		animationDirection = 'forward';
		isAnimating = true;
		stack = [...stack, noteId];

		// Scroll viewport to top for new page
		if (viewportEl) viewportEl.scrollTop = 0;

		const duration = prefersReducedMotion ? 150 : 300;
		setTimeout(() => {
			isAnimating = false;
			animationDirection = 'none';
		}, duration);
	}

	function navigateBack() {
		if (isAnimating || stack.length <= 1) {
			// At root — close overlay
			if (stack.length <= 1) {
				onClose?.();
			}
			return;
		}

		animationDirection = 'back';
		isAnimating = true;

		const duration = prefersReducedMotion ? 150 : 300;
		setTimeout(() => {
			stack = stack.slice(0, -1);
			isAnimating = false;
			animationDirection = 'none';
		}, duration);
	}

	function handleWikilinkClick(target: string) {
		navigateForward(target);
	}

	// --- Swipe-back gesture ---

	function handleTouchStart(e: TouchEvent) {
		if (isAnimating || stack.length <= 1) return;

		const touch = e.touches[0];
		// Only activate from left 40px edge zone
		if (touch.clientX > 40) return;

		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchStartTime = Date.now();
		isSwipeGesture = false;
		gestureDecided = false;
		swipeOffset = 0;
	}

	function handleTouchMove(e: TouchEvent) {
		if (isAnimating || touchStartX === 0) return;

		const touch = e.touches[0];
		const dx = touch.clientX - touchStartX;
		const dy = touch.clientY - touchStartY;

		// Decide gesture direction on first significant movement
		if (!gestureDecided && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
			gestureDecided = true;
			// Cancel if vertical movement dominates (user is scrolling)
			if (Math.abs(dy) > Math.abs(dx)) {
				touchStartX = 0;
				return;
			}
			isSwipeGesture = true;
			isSwiping = true;
		}

		if (isSwipeGesture && dx > 0) {
			swipeOffset = dx;
			// Prevent vertical scrolling during horizontal swipe
			e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!isSwipeGesture || !isSwiping) {
			touchStartX = 0;
			isSwiping = false;
			return;
		}

		const velocity = swipeOffset / (Date.now() - touchStartTime);
		const shouldCommit = swipeOffset > 50 || velocity > 0.3;

		if (shouldCommit) {
			// Commit: animate to full width then pop
			swipeOffset = window.innerWidth;
			isSwiping = false;

			const duration = prefersReducedMotion ? 100 : 200;
			setTimeout(() => {
				stack = stack.slice(0, -1);
				swipeOffset = 0;
			}, duration);
		} else {
			// Cancel: snap back
			swipeOffset = 0;
			isSwiping = false;
		}

		touchStartX = 0;
		isSwipeGesture = false;
		gestureDecided = false;
	}

	// Keyboard: Escape to go back
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			navigateBack();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="mobile-reader-overlay"
	bind:this={overlayEl}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<!-- Header -->
	<header class="reader-header">
		<button class="back-btn" onclick={navigateBack}>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<span class="back-label">
				{#if stack.length > 1 && previousNote}
					{previousNote.title}
				{:else}
					Back
				{/if}
			</span>
		</button>

		<!-- Stack depth dots -->
		{#if stack.length > 1}
			<div class="stack-dots">
				{#each stack as _, i}
					<span class="dot" class:active={i === stack.length - 1}></span>
				{/each}
			</div>
		{/if}
	</header>

	<!-- Page viewport -->
	<div
		class="reader-viewport"
		bind:this={viewportEl}
		style:touch-action="pan-y"
	>
		{#if currentNote}
			<div
				class="page-wrapper"
				class:slide-in-right={animationDirection === 'forward' && !prefersReducedMotion}
				class:slide-out-right={animationDirection === 'back' && !prefersReducedMotion}
				class:fade-in={animationDirection === 'forward' && prefersReducedMotion}
				class:fade-out={animationDirection === 'back' && prefersReducedMotion}
				style:transform={isSwiping ? `translateX(${swipeOffset}px)` : ''}
				style:transition={isSwiping ? 'none' : ''}
			>
				{#key currentNoteId}
					<MobileReaderPage
						note={currentNote}
						onWikilinkClick={handleWikilinkClick}
						{isLinkBroken}
					/>
				{/key}
			</div>
		{/if}
	</div>
</div>

<style>
	.mobile-reader-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		animation: overlayFadeIn 200ms ease-out;
	}

	@keyframes overlayFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Header */
	.reader-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		flex-shrink: 0;
		min-height: 48px;
		/* Safe area for notch/dynamic island */
		padding-top: max(12px, env(safe-area-inset-top));
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--text-link);
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 15px;
		cursor: pointer;
		padding: 4px 0;
		max-width: 60%;
		overflow: hidden;
	}

	.back-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stack-dots {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted);
		opacity: 0.3;
	}

	.dot.active {
		opacity: 1;
		background: var(--text-primary);
	}

	/* Viewport */
	.reader-viewport {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: contain;
		/* Safe area for bottom bar */
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* Page wrapper — animation target */
	.page-wrapper {
		min-height: 100%;
	}

	/* Slide animations (GPU-accelerated) */
	.slide-in-right {
		animation: slideFromRight 300ms ease-out;
	}

	.slide-out-right {
		animation: slideToRight 300ms ease-out;
	}

	@keyframes slideFromRight {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	@keyframes slideToRight {
		from { transform: translateX(0); }
		to { transform: translateX(100%); }
	}

	/* Reduced motion fallbacks */
	.fade-in {
		animation: fadeIn 150ms ease-out;
	}

	.fade-out {
		animation: fadeOut 150ms ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes fadeOut {
		from { opacity: 1; }
		to { opacity: 0; }
	}
</style>

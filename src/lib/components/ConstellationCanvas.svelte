<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ConstellationCard } from '$lib/types/constellation.js';

	export type { ConstellationCard };

	interface ScatteredCard extends ConstellationCard {
		x: number;
		y: number;
		z: number;
		rotY: number;
		colorIndex: number;
	}

	interface Props {
		cards: ConstellationCard[];
		onBack?: () => void;
		/** Hide back button, label, hint — for embedding in landing page */
		bare?: boolean;
	}

	let { cards, onBack, bare = false }: Props = $props();

	// ── Reactive state (hover, controls visibility) ──
	let hoveredId = $state<string | null>(null);
	let hintVisible = $state(true);
	let scattered = $state<ScatteredCard[]>([]);

	// ── DOM refs (plain JS, not reactive) ──
	let stageEl: HTMLDivElement;
	let worldEl: HTMLDivElement;
	const cardEls = new Map<string, HTMLDivElement>();

	// ── Camera (plain JS, updated 60fps in RAF) ──
	let camX = 0, camY = 0, camZ = 0;
	let velX = 0, velY = 0, velZ = 0;
	let driftT = 0;
	let userActive = false;
	let animId: number;
	const keysDown = new Set<string>();

	// ── Drag/touch ──
	let dragging = false;
	let lastPX = 0, lastPY = 0;

	// ── Timers ──
	let userTimer: ReturnType<typeof setTimeout>;

	// ── Fallback gradient palettes for no-cover cards ──
	const GRADIENTS = [
		'linear-gradient(150deg, #12141c 0%, #1c1e2e 55%, #0e1020 100%)',
		'linear-gradient(150deg, #18100a 0%, #2a1c0c 55%, #100c05 100%)',
		'linear-gradient(150deg, #0e1a1a 0%, #122222 55%, #081212 100%)',
		'linear-gradient(150deg, #18100e 0%, #261410 55%, #100a08 100%)',
		'linear-gradient(150deg, #0e1520 0%, #131e30 55%, #080e18 100%)',
		'linear-gradient(150deg, #141010 0%, #201414 55%, #0c0808 100%)',
	];

	// ── Scatter algorithm ──
	function scatter(items: ConstellationCard[]): ScatteredCard[] {
		const positions: [number, number, number][] = [];
		const result: ScatteredCard[] = [];

		for (let i = 0; i < items.length; i++) {
			const card = items[i];
			let x = 0, y = 0, z = 0;
			let safe = false;
			let tries = 0;

			while (!safe && tries < 160) {
				x = (Math.random() - 0.5) * 2200;
				y = (Math.random() - 0.5) * 1300;
				z = (Math.random() - 0.5) * 2400;
				safe = positions.every(([px, py, pz]) => {
					const d = Math.sqrt((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2);
					return d > 460;
				});
				tries++;
			}
			positions.push([x, y, z]);

			result.push({
				...card,
				x,
				y,
				z,
				rotY: (Math.random() - 0.5) * 16,
				colorIndex: i % GRADIENTS.length,
			});
		}

		return result;
	}

	// ── Camera helpers ──
	function markUserActive() {
		userActive = true;
		clearTimeout(userTimer);
		userTimer = setTimeout(() => { userActive = false; }, 2200);
	}


	// ── Animation loop ──
	function tick() {
		animId = requestAnimationFrame(tick);
		driftT += 0.0014;

		const speed = 3.2;

		if (keysDown.has('w') || keysDown.has('arrowup')) { velZ -= speed; markUserActive(); }
		if (keysDown.has('s') || keysDown.has('arrowdown')) { velZ += speed; markUserActive(); }
		if (keysDown.has('a') || keysDown.has('arrowleft')) { velX -= speed; markUserActive(); }
		if (keysDown.has('d') || keysDown.has('arrowright')) { velX += speed; markUserActive(); }
		if (keysDown.has('q')) { velY -= speed; markUserActive(); }
		if (keysDown.has('e')) { velY += speed; markUserActive(); }

		// Gentle drift when idle
		if (!userActive) {
			velX += Math.sin(driftT * 0.38) * 0.055;
			velY += Math.cos(driftT * 0.22) * 0.038;
			velZ += Math.sin(driftT * 0.16) * 0.048;
		}

		// Momentum decay
		velX *= 0.88;
		velY *= 0.88;
		velZ *= 0.88;

		camX += velX;
		camY += velY;
		camZ += velZ;

		// Direct DOM update — bypasses Svelte reactivity for 60fps perf
		if (worldEl) {
			worldEl.style.transform = `translate3d(${-camX}px,${-camY}px,${-camZ}px)`;
		}

		// Depth-sort: cards closer to camera get higher z-index
		for (const c of scattered) {
			const el = cardEls.get(c.id);
			if (!el) continue;
			const dist = Math.sqrt((c.x - camX) ** 2 + (c.y - camY) ** 2 + (c.z - camZ) ** 2);
			el.style.zIndex = String(Math.round(100000 / (dist + 1)));
		}
	}

	// ── Svelte action to capture each card's DOM element ──
	function registerCard(el: HTMLElement, id: string) {
		cardEls.set(id, el as HTMLDivElement);
		return { destroy() { cardEls.delete(id); } };
	}


	// ── Event handlers ──
	function onKeyDown(e: KeyboardEvent) {
		const t = e.target as HTMLElement;
		if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
		keysDown.add(e.key.toLowerCase());
		if (e.key === 'Escape' && onBack) onBack();
	}

	function onKeyUp(e: KeyboardEvent) {
		keysDown.delete(e.key.toLowerCase());
	}

	function onPointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement).closest('a, button')) return;
		dragging = true;
		lastPX = e.clientX;
		lastPY = e.clientY;
		stageEl?.setPointerCapture(e.pointerId);
		markUserActive();
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const dx = e.clientX - lastPX;
		const dy = e.clientY - lastPY;
		velX -= dx * 0.7;
		velY -= dy * 0.7;
		lastPX = e.clientX;
		lastPY = e.clientY;
		markUserActive();
	}

	function onPointerUp() { dragging = false; }

	function onWheel(e: WheelEvent) {
		velZ += e.deltaY * 0.55;
		markUserActive();
		e.preventDefault();
	}

	onMount(() => {
		scattered = scatter(cards);

		animId = requestAnimationFrame(tick);

		// Hide hint after 5s
		setTimeout(() => { hintVisible = false; }, 5000);

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		stageEl?.addEventListener('wheel', onWheel, { passive: false });
	});

	onDestroy(() => {
		cancelAnimationFrame(animId);
		clearTimeout(userTimer);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
		stageEl?.removeEventListener('wheel', onWheel);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="stage"
	bind:this={stageEl}
	onpointermove={onPointerMove}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	role="region"
	aria-label="Conversation constellation"
>
	<!-- Atmospheric background -->
	<div class="bg"></div>
	<div class="bg-glow bg-glow-1"></div>
	<div class="bg-glow bg-glow-2"></div>
	<div class="bg-glow bg-glow-3"></div>

	<!-- 3D world — transform updated by RAF -->
	<div class="world" bind:this={worldEl}>
		{#each scattered as card (card.id)}
			<div
				class="card-wrap"
				style="transform: translate3d({card.x}px,{card.y}px,{card.z}px) rotateY({card.rotY}deg)"
				use:registerCard={card.id}
				onmouseenter={() => hoveredId = card.id}
				onmouseleave={() => hoveredId = null}
			>
				<a
					href={card.href}
					class="card"
					class:hovered={hoveredId === card.id}
					aria-label={card.title ?? 'Untitled conversation'}
				>
					<!-- Cover image or gradient fallback -->
					{#if card.cover_image_url}
						<img src={card.cover_image_url} alt="" class="cover-img" loading="lazy" />
					{:else}
						<div class="cover-gradient" style="background: {GRADIENTS[card.colorIndex]}"></div>
					{/if}

					<!-- Bottom gradient overlay -->
					<div class="overlay"></div>

					<!-- Archive badge -->
					{#if card.archived}
						<div class="badge badge-archive">
							<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
								<circle cx="4" cy="4" r="3" stroke="currentColor" stroke-width="1"/>
								<path d="M4 2.5v1.8l1 1" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>
							</svg>
							from the archives
						</div>
					{/if}

					<!-- Arrow icon (hover) -->
					<div class="arrow-icon" aria-hidden="true">
						<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
							<path d="M2 9L9 2M9 2H4M9 2v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>

					<!-- Card body -->
					<div class="card-body">
						{#if card.snippet}
							<p class="snippet">{card.snippet}</p>
						{/if}
						<h3 class="title">{card.title ?? 'Untitled'}</h3>
						<div class="author">@{card.author_username}</div>
					</div>
				</a>
			</div>
		{/each}
	</div>

	<!-- Back button (hidden in bare mode) -->
	{#if !bare}
		{#if onBack}
			<button class="back-btn" onclick={onBack} aria-label="Exit constellation">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				back
			</button>
		{:else}
			<a href="/discover" class="back-btn" aria-label="Back to discover">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				back
			</a>
		{/if}

		<!-- Label -->
		<div class="label" aria-hidden="true">
			<span class="label-dot"></span>
			constellation
		</div>

		<!-- Navigation hint (two lines) -->
		<div class="hint" class:hint-hidden={!hintVisible} aria-hidden="true">
			<span>Click and drag your mouse, or press the &#9668; &#9658; keys, to look around</span>
			<span>Scroll up/down or press the &#9650; &#9660; keys to move forwards and backwards</span>
		</div>
	{/if}

</div>

<style>
	/* ── Stage ── */
	.stage {
		position: fixed;
		inset: 0;
		overflow: hidden;
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
		perspective: 1000px;
		perspective-origin: 50% 50%;
	}

	.stage:active { cursor: grabbing; }

	/* ── Background ── */
	.bg {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 48% 45%, #17181f 0%, #09090e 65%, #050508 100%);
	}

	.bg-glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		filter: blur(120px);
		opacity: 0.18;
	}

	.bg-glow-1 {
		width: 600px;
		height: 400px;
		top: 10%;
		left: 15%;
		background: radial-gradient(circle, #2a1f0e 0%, transparent 70%);
	}

	.bg-glow-2 {
		width: 500px;
		height: 380px;
		bottom: 20%;
		right: 10%;
		background: radial-gradient(circle, #0e1428 0%, transparent 70%);
	}

	.bg-glow-3 {
		width: 350px;
		height: 300px;
		top: 55%;
		left: 40%;
		background: radial-gradient(circle, #14101c 0%, transparent 70%);
	}

	/* ── 3D world ── */
	.world {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
	}

	/* ── Card wrapper (3D anchor) ── */
	.card-wrap {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
	}

	/* ── Card (visible surface) ── */
	.card {
		position: absolute;
		left: -120px;   /* -width/2 */
		top: -150px;    /* -height/2 */
		width: 240px;
		height: 300px;
		border-radius: 14px;
		overflow: hidden;
		background: #111116;
		text-decoration: none;
		color: inherit;
		display: block;
		box-shadow:
			0 20px 56px rgba(0, 0, 0, 0.7),
			0 4px 12px rgba(0, 0, 0, 0.5),
			inset 0 0 0 1px rgba(255, 255, 255, 0.06);
		transition: transform 0.32s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.32s ease;
		will-change: transform;
	}

	.card.hovered,
	.card:hover {
		transform: scale(1.05) translateY(-6px);
		box-shadow:
			0 32px 72px rgba(0, 0, 0, 0.8),
			0 8px 24px rgba(0, 0, 0, 0.6),
			inset 0 0 0 1px rgba(255, 255, 255, 0.12);
	}

	/* ── Cover media ── */
	.cover-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover-gradient {
		position: absolute;
		inset: 0;
	}

	/* ── Gradient overlay ── */
	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.95) 0%,
			rgba(0, 0, 0, 0.65) 40%,
			rgba(0, 0, 0, 0.15) 70%,
			transparent 100%
		);
	}

	/* ── Archive badge ── */
	.badge {
		position: absolute;
		top: 12px;
		left: 12px;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border-radius: 100px;
		padding: 4px 9px 4px 8px;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		backdrop-filter: blur(8px);
		pointer-events: none;
	}

	.badge-archive {
		background: rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.6);
	}

	/* ── Arrow icon (hover) ── */
	.arrow-icon {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.8);
		opacity: 0;
		transform: scale(0.75);
		transition: opacity 0.22s ease, transform 0.22s ease;
		backdrop-filter: blur(6px);
		pointer-events: none;
	}

	.card.hovered .arrow-icon,
	.card:hover .arrow-icon {
		opacity: 1;
		transform: scale(1);
	}

	/* ── Card body ── */
	.card-body {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 14px 14px 16px;
	}

	.snippet {
		font-size: 11.5px;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.62);
		margin: 0 0 9px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		opacity: 0;
		transform: translateY(7px);
		transition: opacity 0.26s ease, transform 0.26s ease;
	}

	.card.hovered .snippet,
	.card:hover .snippet {
		opacity: 1;
		transform: translateY(0);
	}

	.title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 14.5px;
		font-weight: 400;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 6px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.author {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.35);
	}

	/* ── Back button ── */
	.back-btn {
		position: fixed;
		top: 20px;
		left: 20px;
		z-index: 1000;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 14px;
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		backdrop-filter: blur(10px);
		color: rgba(255, 255, 255, 0.55);
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		letter-spacing: 0.08em;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.16s, color 0.16s;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.13);
		color: rgba(255, 255, 255, 0.85);
	}

	/* ── Label (top-right) ── */
	.label {
		position: fixed;
		top: 24px;
		right: 24px;
		z-index: 1000;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.25);
	}

	.label-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		animation: pulse 2.8s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.7; }
	}

	/* ── Navigation hint ── */
	.hint {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		pointer-events: none;
		text-align: center;
		transition: opacity 0.8s ease;
	}

	.hint span {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: clamp(0.75rem, 1.1vw, 0.9rem);
		font-weight: 300;
		color: rgba(255, 255, 255, 0.35);
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	.hint-hidden { opacity: 0; }


	/* ── Mobile ── */
	@media (max-width: 640px) {
		.card {
			width: 196px;
			height: 244px;
			left: -98px;
			top: -122px;
		}

		.title { font-size: 13px; }
		.hint { display: none; }
	}
</style>

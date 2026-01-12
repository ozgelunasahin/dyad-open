<script lang="ts">
	import type { Point } from '$lib/types';

	interface Props {
		from: Point;
		to: Point;
		isActive: boolean;
	}

	let { from, to, isActive }: Props = $props();

	// Create a smooth bezier curve with more organic flow
	let path = $derived.by(() => {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Control point offset based on distance for natural curves
		const curvature = Math.min(distance * 0.3, 100);

		// Determine curve direction based on relative positions
		const midX = from.x + dx * 0.5;
		const midY = from.y + dy * 0.5;

		// Create S-curve for more organic feel
		const ctrl1X = from.x + dx * 0.25;
		const ctrl1Y = from.y + curvature * (dy > 0 ? 0.5 : -0.5);
		const ctrl2X = from.x + dx * 0.75;
		const ctrl2Y = to.y - curvature * (dy > 0 ? 0.5 : -0.5);

		return `M ${from.x} ${from.y} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${to.x} ${to.y}`;
	});
</script>

<path d={path} class="connection" class:active={isActive} fill="none" />

<style>
	.connection {
		stroke: var(--line-color);
		stroke-width: 1;
		transition: stroke 0.3s ease;
		pointer-events: none;
	}

	.connection.active {
		stroke: var(--line-color-active);
		stroke-width: 1;
	}
</style>

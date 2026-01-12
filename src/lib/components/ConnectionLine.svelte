<script lang="ts">
	import type { Point } from '$lib/types';

	interface Props {
		from: Point;
		to: Point;
		isActive: boolean;
	}

	let { from, to, isActive }: Props = $props();

	let path = $derived.by(() => {
		const dx = to.x - from.x;
		const midX = from.x + dx * 0.5;

		return `M ${from.x} ${from.y} Q ${midX} ${from.y}, ${to.x} ${to.y}`;
	});
</script>

<path d={path} class="connection" class:active={isActive} fill="none" />

<style>
	.connection {
		stroke: #cbd5e1;
		stroke-width: 2;
		transition:
			stroke 0.2s ease,
			stroke-width 0.2s ease;
		pointer-events: none;
	}

	.connection.active {
		stroke: #3b82f6;
		stroke-width: 3;
	}
</style>

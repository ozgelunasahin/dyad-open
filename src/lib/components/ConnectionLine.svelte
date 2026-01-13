<script lang="ts">
	interface Props {
		path: string;
		isActive: boolean;
		pathFailed?: boolean;
	}

	let { path, isActive, pathFailed = false }: Props = $props();
</script>

<path d={path} class="connection" class:active={isActive} class:failed={pathFailed} fill="none" />

<style>
	.connection {
		stroke: var(--line-color);
		stroke-width: 1;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: stroke 0.3s ease;
		pointer-events: none;
	}

	.connection.active {
		stroke: var(--line-color-active);
		stroke-width: 1.5;
	}

	/* Failed pathfinding - visible red dashed line */
	.connection.failed {
		stroke: #ef4444;
		stroke-width: 4;
		stroke-dasharray: 8 4;
	}
</style>

<script lang="ts">
	interface Props {
		path: string;
		isActive: boolean;
	}

	let { path, isActive }: Props = $props();
</script>

<path d={path} class="connection" class:active={isActive} fill="none" />

<style>
	.connection {
		stroke: var(--line-color);
		stroke-width: 1.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: stroke 0.3s ease;
		pointer-events: none;
	}

	.connection.active {
		stroke: var(--line-color-active);
		stroke-width: 1.2;
	}
</style>

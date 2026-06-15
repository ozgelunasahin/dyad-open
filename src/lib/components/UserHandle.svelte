<script lang="ts">
	interface Props {
		username: string;
		displayName?: string | null;
	}
	let { username, displayName = null }: Props = $props();
</script>

<a href="/users/{username}" class="user-handle">{displayName ?? '@' + username}</a>

<style>
	.user-handle {
		color: var(--text-primary);
		text-decoration: none;
		font-weight: 500;
	}
	.user-handle:hover {
		text-decoration: underline;
	}
</style>

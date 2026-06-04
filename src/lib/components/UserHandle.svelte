<script lang="ts">
	// A username as a link to the member's public page. Use wherever a handle
	// appears in text — headings, attributions, status lines — so usernames
	// navigate consistently. Hover treatment comes from the design system
	// (`.user-handle` in src/lib/styles/shared.css), never per component.
	// (Inside an <a>-wrapped card, render the plain string instead — nested
	// anchors are invalid HTML.)
	let { username }: { username: string } = $props();
</script>

<a class="user-handle" href="/users/{username}">@{username}</a>

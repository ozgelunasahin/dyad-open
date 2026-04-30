<script lang="ts">
	import NewsletterEditor from '../NewsletterEditor.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Edit — {data.post.title} — admin</title></svelte:head>
<NewsletterEditor post={data.post} />

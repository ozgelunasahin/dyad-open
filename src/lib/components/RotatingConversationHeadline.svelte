<script lang="ts">
	import { onMount } from 'svelte';

	const words = ['writers', 'artists', 'researchers', 'people with questions', 'you'];
	const INTERVAL = 2800;
	const DURATION = 420;

	let index = $state(0);
	let visible = $state(true);

	onMount(() => {
		const timer = setInterval(() => {
			visible = false;
			setTimeout(() => {
				index = (index + 1) % words.length;
				visible = true;
			}, DURATION);
		}, INTERVAL);

		return () => clearInterval(timer);
	});
</script>

<h1 class="headline">
	<span class="rotating-wrapper">
		<span class="rotating-word" class:in={visible} class:out={!visible}>
			{words[index]}
		</span>
	</span>
	<br />
	<span class="static">in conversation</span>
</h1>

<style>
	.headline {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(3.2rem, 5.5vw, 6rem);
		font-weight: normal;
		line-height: 0.92;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 28px;
		letter-spacing: -0.01em;
	}

	.rotating-wrapper {
		display: inline-block;
	}

	.rotating-word {
		display: inline-block;
		transition:
			opacity var(--dur) ease,
			transform var(--dur) ease;
		--dur: 420ms;
		opacity: 0;
		transform: translateY(6px);
	}

	.rotating-word.in {
		opacity: 1;
		transform: translateY(0);
	}

	.rotating-word.out {
		opacity: 0;
		transform: translateY(-6px);
	}

	.static {
		display: inline;
	}

	@media (max-width: 430px) {
		.headline {
			font-size: 11vw;
		}
	}
</style>

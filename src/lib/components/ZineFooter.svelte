<!-- Shared zine footer — used by the (zine) layout. -->
<script lang="ts">
	import { env } from '$env/dynamic/public';

	// Social/blog links render only when configured, following the repo's
	// env-gating pattern (cf. zine payment links). Set in the Pages env:
	// PUBLIC_BLOG_URL, PUBLIC_INSTAGRAM_URL, PUBLIC_BLUESKY_URL, PUBLIC_YOUTUBE_URL.
	const blogUrl = (env.PUBLIC_BLOG_URL ?? '').trim();
	const instagramUrl = (env.PUBLIC_INSTAGRAM_URL ?? '').trim();
	const blueskyUrl = (env.PUBLIC_BLUESKY_URL ?? '').trim();
	const youtubeUrl = (env.PUBLIC_YOUTUBE_URL ?? '').trim();
</script>

<footer class="zine-footer">
	<div class="footer-inner">
		<div class="footer-grid">
			<div class="footer-col">
				<p class="footer-col-head">Community</p>
				<a href="/signup" class="footer-link">Become a member</a>
				<a href="/newsletter" class="footer-link">Newsletter</a>
				{#if blogUrl}<a href={blogUrl} class="footer-link" target="_blank" rel="noopener">Blog</a>{/if}
				{#if instagramUrl}<a href={instagramUrl} class="footer-link" target="_blank" rel="noopener">Instagram</a>{/if}
				{#if blueskyUrl}<a href={blueskyUrl} class="footer-link" target="_blank" rel="noopener">Bluesky &amp; Blacksky</a>{/if}
				{#if youtubeUrl}<a href={youtubeUrl} class="footer-link" target="_blank" rel="noopener">YouTube</a>{/if}
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Resources</p>
				<a href="/docs#about-why" class="footer-link">About Us</a>
				<a href="/docs#about-care" class="footer-link">Community</a>
				<a href="/docs#bylaws" class="footer-link">Governance</a>
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Legal</p>
				<a href="/legal#impressum" class="footer-link">Impressum</a>
				<a href="/legal#agb" class="footer-link">AGB</a>
				<a href="/legal#datenschutz" class="footer-link">Privacy</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.zine-footer {
		border-top: 1px solid rgba(27, 28, 30, 0.06);
		padding: 64px 0 48px;
	}

	/* Footer content aligns to the same 1080px/48px measure as /newsletter's
	   archive index (.archive): max-width is the full border-box including
	   padding, so the inner content inset matches exactly, not just the
	   outer box. */
	.footer-inner {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 48px;
	}

	/* Three columns spread across the same measure the page content itself
	   uses (.footer-inner's 1080px/48px, matching .page and .archive) rather
	   than left-hugging at a fixed column width. */
	.footer-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 40px;
		margin-bottom: 56px;
	}

	.footer-col-head {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(27, 28, 30, 0.5);
		margin: 0 0 16px;
	}

	.footer-link {
		display: block;
		font-family: var(--font-serif);
		font-size: 0.85rem;
		font-weight: 300;
		color: rgba(27, 28, 30, 0.4);
		text-decoration: none;
		margin-bottom: 10px;
		line-height: 1.4;
		transition: color 0.15s;
	}

	.footer-link:hover {
		color: rgba(27, 28, 30, 0.85);
	}

	@media (max-width: 640px) {
		.zine-footer {
			padding: 40px 0 40px;
		}
		.footer-inner {
			padding: 0 20px;
		}
		.footer-grid {
			grid-template-columns: 1fr 1fr;
			gap: 32px;
		}
	}
</style>

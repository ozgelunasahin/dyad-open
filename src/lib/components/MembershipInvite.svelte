<!-- Shared "Become a member" invite block — same design at the end of every
     newsletter post, reused wherever a page wants the same closing CTA
     (currently also the docs "Become a member" section). Uses the zine ink
     scale directly rather than the newsletter's --paper-* tokens so it drops
     into any zine-family page without extra wiring. -->
<script lang="ts">
	import { storageUrl } from '$lib/utils/storage-url';
</script>

<section class="membership-invite">
	<div class="invite-text">
		<h2 class="invite-title">Become a member</h2>
		<p class="invite-body">Join a network of people meeting weekly for face to face conversations, receive our weekly newsletter, and get involved in our collective governance process.</p>
		<a href="/signup" class="invite-link">Join us <span aria-hidden="true">→</span></a>
	</div>
	<img class="invite-image" src={storageUrl('newsletter assets', 'cover, become a comember.webp')} alt="" />
</section>

<style>
	/* Bold headline and CTA on the left, an image panel on the right. */
	.membership-invite {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 56px;
		max-width: 1080px;
		margin: 88px auto;
		padding: 64px 24px;
		border-top: 1px solid rgba(27, 28, 30, 0.08);
		border-bottom: 1px solid rgba(27, 28, 30, 0.08);
	}

	.invite-title {
		font-family: Futura, 'Futura PT', 'Avenir Next', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: clamp(1.6rem, 3.6vw, 2.4rem);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		color: rgba(27, 28, 30, 0.9);
		margin: 0 0 20px;
	}

	.invite-body {
		font-family: var(--font-serif);
		font-size: 1rem;
		line-height: 1.55;
		color: rgba(27, 28, 30, 0.7);
		max-width: 44ch;
		margin: 0 0 28px;
	}

	.invite-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 0.95rem;
		font-weight: 600;
		color: rgba(27, 28, 30, 0.9);
		text-decoration: none;
		border-bottom: 1px solid rgba(27, 28, 30, 0.9);
		padding-bottom: 2px;
		transition: color 0.15s, border-color 0.15s;
	}

	.invite-link:hover {
		color: #4a5d3f;
		border-color: #4a5d3f;
	}

	.invite-link span { transition: transform 0.15s; }
	.invite-link:hover span { transform: translateX(3px); }

	/* Uncropped: natural aspect ratio, no object-fit: cover — same rule as
	   the essay hero and the archive listing covers. */
	.invite-image {
		width: 100%;
		height: auto;
		border-radius: 3px;
		display: block;
	}

	@media (max-width: 760px) {
		.membership-invite { grid-template-columns: 1fr; gap: 32px; margin: 64px auto; padding: 48px 24px; }
	}
</style>

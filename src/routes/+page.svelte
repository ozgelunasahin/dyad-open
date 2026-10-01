<script lang="ts">
	import AuthDialog from '$lib/components/AuthDialog.svelte';
	import { copy } from '$lib/copy';
	import { env } from '$env/dynamic/public';
	import { storageUrl } from '$lib/utils/storage-url';

	// Social links, env-gated exactly like ZineFooter — a link renders only
	// when its URL is configured in the Pages env.
	const instagramUrl = (env.PUBLIC_INSTAGRAM_URL ?? '').trim();
	const blueskyUrl = (env.PUBLIC_BLUESKY_URL ?? '').trim();

	const og = copy.landing;
	const ogImage = `${og.ogUrl}/images/og-card-v2.png`;

	let authDialog = $state<AuthDialog | undefined>();

	// Static pastoral backdrop. Lives in the 'newsletter assets' bucket the
	// newsletter cover images use — confirmed with a direct request (200).
	const bgImageUrl = storageUrl('newsletter assets', 'landing page.jpg');

	// Join is a plain link to /signup; login opens in a dialog over the landing page.
	function openLogin() {
		authDialog?.show();
	}
</script>

<svelte:head>
	<title>{og.title}</title>
	<meta name="description" content={og.metaDescription} />

	<!-- Open Graph (Facebook, LinkedIn, Slack, iMessage, Discord, Signal, …) -->
	<meta property="og:title" content={og.title} />
	<meta property="og:description" content={og.metaDescription} />
	<meta property="og:url" content={og.ogUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={og.ogSiteName} />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={og.title} />
	<meta name="twitter:description" content={og.metaDescription} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<!-- ── Hero over a static photo ──
     Deliberately theme-independent, like the (zine) pages: its own local
     --landing-* custom properties, not the global light/dark tokens, so it
     always reads bright regardless of the app's own theme toggle. -->

<div class="shell">
	<!-- Static pastoral backdrop. The gradient is the base layer; the photo
	     sits on top of it as a second background-image layer, so a 404 just
	     leaves the gradient showing — no broken-image glitch, no JS needed. -->
	<div class="sky" style:background-image={`url(${bgImageUrl}), var(--sky-fallback-gradient)`} aria-hidden="true">
		<div class="sky-scrim"></div>
	</div>

	<!-- Top-left: wordmark. -->
	<div class="intro">
		<a href="/" class="wordmark" aria-label="Dyad, home">{og.wordmark}</a>
	</div>

	<!-- A direct child of .shell, not of .left: .left carries its own z-index,
	     and a stacking context cannot be escaped from the inside. -->
	<div class="left-links">
		<!-- href fallback so this action degrades without JS -->
		<a href="/login" class="text-link" onclick={(e) => { e.preventDefault(); openLogin(); }}>{og.logIn}</a>
		<a href="/signup" class="btn-join" data-testid="join-cta">{og.join}</a>
	</div>

	<section class="left">
		<header class="left-head">
			<h1 class="left-title">{og.headline}</h1>

			<p class="left-subline">{og.sublineLead}</p>

			<p class="left-who">{og.whoLead}</p>
			<p class="left-for">{og.sublineFor}</p>

		</header>

		<footer class="site-footer">
			<a href="/docs" class="footer-link">{og.footerDocs}</a>
			<a href="/wiggling" class="footer-link">{og.footerCommunity}</a>
			<a href="/newsletter" class="footer-link">{og.footerNewsletter}</a>
			<a href="/legal" class="footer-link">{og.footerLegal}</a>
			{#if instagramUrl}<a href={instagramUrl} class="footer-link is-social" target="_blank" rel="noopener">Instagram</a>{/if}
			{#if blueskyUrl}<a href={blueskyUrl} class="footer-link is-social" target="_blank" rel="noopener">Bluesky &amp; Blacksky</a>{/if}
		</footer>
	</section>
</div>

<AuthDialog bind:this={authDialog} />

<style>
	:global(body) { margin: 0; overflow: hidden; }

	/* ── Shell — full-bleed photo behind everything. ── */
	.shell {
		--landing-bg: #faf8f3;              /* zine paper, matched exactly */
		/* Text over the photo is the paper colour, not ink — the type reads as
		   cut out of the background. The contrast that makes it readable comes
		   from --landing-plate below, not from the photograph, whose brightness
		   we do not control. Anywhere text sits ON the paper instead of over
		   the photo — the footer on mobile — these are re-scoped back to the
		   dark values; see the mobile block. */
		/* Muted warm off-white, not the paper's full brightness — pure #faf8f3
		   over a photo reads as glowing rather than printed. */
		--landing-ink: #e4dfd3;
		/* Two near-full steps below the ink. They are tonal refinements, not
		   softening: measured over --landing-plate against a white photo they
		   hold 5.9:1 and 5.2:1, both past the 4.5:1 floor for body text. */
		--landing-ink-soft: rgba(228, 223, 211, 0.95);
		--landing-ink-muted: rgba(228, 223, 211, 0.86);
		--landing-ink-invert: #2a1f16;        /* dark text, for the light-filled CTA */
		--landing-hairline: rgba(250, 248, 243, 0.28);
		--sky-fallback-gradient: linear-gradient(175deg, #dce4e2 0%, #eae6da 55%, #f3efe4 100%);
		/* The legibility plate. Every wash that sits directly under type uses
		   this one alpha, so the guarantee is a single number: over a pure
		   white photograph it composites to a relative luminance of 0.076,
		   which carries --landing-ink at 6.3:1. Lowering it breaks WCAG AA. */
		--landing-plate: rgba(26, 21, 15, 0.76);
		/* How far above the text the plate fades in. Nothing readable may sit
		   inside this band — it is bleed, not a ground for type. */
		--plate-fade: 7rem;
		/* Height of the wordmark row's plate; see .sky-scrim for the
		   measurement it comes from. */
		--topbar-plate-h: 64px;
		/* The wordmark's type, kept as tokens so the mobile actions can be
		   centred on its line box rather than on a guessed pixel offset. */
		--wordmark-size: clamp(1.1rem, 1.7vw, 1.45rem);
		--wordmark-leading: 1.15;
		/* Type stacks shared with the newsletter (see (zine)/newsletter):
		   Futura for uppercase headings, system sans for uppercase kickers
		   and utility chrome, SangBleu (--font-serif, app.css) for prose. */
		--font-display: Futura, 'Futura PT', 'Avenir Next', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
		--font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		/* A refinement only: the shadow settles the type onto the photograph.
		   It carries no part of the contrast ratio — WCAG does not count a
		   shadow — so it can be removed without making anything unreadable. */
		--ink-halo: 0 1px 10px rgba(26, 21, 15, 0.35);

		position: fixed;
		inset: 0;
		display: flex;
		background: var(--landing-bg);
		/* Less inset at the bottom than the other three sides — the hero text
		   sits lower, closer to the ground of the photo. */
		padding: var(--space-6) var(--space-6) var(--space-4);
		box-sizing: border-box;
	}

	/* ── Sky — the photo, with the gradient as its base layer (set as a
	   second background-image inline) so a 404 leaves a warm gradient
	   rather than a broken box. ── */
	.sky {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background-repeat: no-repeat, no-repeat;
		background-size: cover, cover;
		background-position: center, center;
	}
	/* The top band is the plate for the wordmark row, and it is sized to that
	   row rather than guessed. The row starts at --space-6 and its tallest
	   element is the Join pill, which is centred on the wordmark's line box
	   and overhangs it: 24px inset + a ~36px pill puts the last ink at ~52px.
	   --topbar-plate-h is that, plus margin for the halo. The fade then runs
	   twice the band's own height, which is enough to read as a gradient and
	   short enough to give the photograph back near the top of the image. */
	.sky-scrim {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				to bottom,
				var(--landing-plate) 0,
				var(--landing-plate) var(--topbar-plate-h),
				rgba(26, 21, 15, 0) calc(var(--topbar-plate-h) * 3.5)
			),
			rgba(26, 21, 15, 0.12);
	}

	/* ── Top-left: wordmark + toggle nav ── */
	.intro {
		position: absolute;
		top: var(--space-6);
		left: var(--space-6);
		z-index: 40;
	}

	.wordmark {
		font-family: var(--font-serif);
		font-size: var(--wordmark-size);
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--landing-ink);
		text-decoration: none;
		line-height: var(--wordmark-leading);
		text-shadow: var(--ink-halo);
	}

	/* ── Bottom-left: headline + footer ── */
	.left {
		position: relative;
		z-index: 20;
		/* Sizing reference for the headline: the column's width is capped, so
		   it is not a fixed fraction of the viewport — vw would guess wrong.
		   cqw measures the real thing. */
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		/* The measure we want for the copy; nothing sits at the right edge any
		   more, so this is a plain cap rather than a derived one. */
		max-width: 880px;
		margin-top: auto;
		box-sizing: border-box;
	}

	/* The legibility plate for the hero copy. Anchored to the text block and
	   bled off every edge, so the wash is at full strength everywhere type can
	   land and fades only in the --plate-fade band above it. This, not the
	   photograph and not the text shadow, is what carries the contrast ratio. */
	.left::before {
		content: '';
		position: absolute;
		left: -100vw;
		right: -100vw;
		top: calc(var(--plate-fade) * -1);
		bottom: -100vh;
		background: linear-gradient(
			to bottom,
			rgba(26, 21, 15, 0) 0,
			var(--landing-plate) var(--plate-fade),
			var(--landing-plate) 100%
		);
		pointer-events: none;
		z-index: -1;
	}

	.left-head { position: relative; margin-top: auto; margin-bottom: 0; }

	.left-title {
		font-family: var(--font-serif);
		/* One row. ~5.1% of the column per character-width keeps all 40
		   characters on a single line; the cap stops it growing past a
		   comfortable display size on wide screens. The clamp above it is the
		   fallback for engines without container query units. */
		font-size: clamp(1.6rem, 2.4vw, 2.6rem);
		font-size: min(2.6rem, 5.1cqw);
		white-space: nowrap;
		font-weight: 700;
		/* A step softer than full strength: at this size the headline carries
		   by scale. It still clears AA against the plate beneath it. */
		color: var(--landing-ink-soft);
		margin: 0 0 var(--space-5);
		line-height: 1.24;
		letter-spacing: -0.015em;
		text-align: left;
		text-wrap: pretty;
		text-shadow: var(--ink-halo);
	}

	/* Under the headline: what dyad is and who it is for, as one paragraph.
	   Set at caption scale rather than as a second headline, so the display
	   line above keeps the weight. */
	/* Everything under the headline shares one treatment, so the block reads as
	   a single voice rather than three tiers of importance. */
	.left-subline,
	.left-who,
	.left-for {
		position: relative;
		font-family: var(--font-serif);
		font-size: clamp(0.88rem, 1.4vw, 1.02rem);
		font-weight: 400;
		line-height: 1.55;
		color: var(--landing-ink-soft);
		max-width: none;
		margin: 0 0 var(--space-4);
		text-shadow: var(--ink-halo);
	}
	.left-subline { margin-top: var(--space-5); }

	/* The actions sit at the top right on every size, opposite the wordmark and
	   centred on its line box. Height and top come from the wordmark's own type
	   tokens, so the two stay optically centred on one line without a measured
	   offset. */
	.left-links {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		position: fixed;
		top: var(--space-6);
		right: var(--space-6);
		height: calc(var(--wordmark-size) * var(--wordmark-leading));
		z-index: 210;
	}

	/* Primary action: a light pill on the hero, sitting last in the row so it
	   holds the outer edge. Its own fill is opaque, so its contrast does not
	   depend on the photo at all. Sign in stays a quiet text link beside it. */
	.btn-join {
		display: inline-flex;
		align-items: center;
		background: var(--landing-ink);
		color: var(--landing-ink-invert);
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		padding: 11px 24px;
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-join:hover { opacity: 0.82; }

	.text-link {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--landing-ink-muted);
		padding: 0;
		text-decoration: none;
		letter-spacing: 0.08em;
		transition: color 0.15s;
	}
	.text-link:hover { color: var(--landing-ink); }

	/* ── Footer ── */
	/* Even distribution: equal space *between* each link rather than a fixed
	   gap, so the row reads as evenly spaced despite the labels differing in
	   width. The gap is the floor, for when the row is too narrow to spread. */
	.site-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		column-gap: var(--space-4);
		row-gap: var(--space-2);
		/* The copy sits directly on the footer rule; the rule's own breathing
		   room is the only separation. */
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--landing-hairline);
	}

	.footer-link {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--landing-ink);
		text-decoration: none;
		white-space: nowrap;
		transition: opacity 0.15s;
		/* 0.85 is the floor here: it composites to 5.1:1 over the plate. */
		opacity: 0.85;
	}
	.footer-link:hover { opacity: 1; }

	/* ── Mobile ──
	   The page scrolls: a full-height photo hero (wordmark + headline + CTA),
	   then the footer sits on the plain paper ground. Every child here needs
	   position:relative, because .sky is absolutely positioned and positioned
	   elements paint above non-positioned siblings regardless of DOM order; a
	   static child would render underneath the photo. */
	@media (max-width: 768px) {
		:global(body) { overflow: auto; }
		.shell {
			position: relative;
			inset: auto;
			min-height: 100vh;
			flex-direction: column;
			padding: 0;
			/* Last resort behind the photo, which now covers the whole
			   shell. Only visible if both the image and its fallback
			   gradient fail. */
			background: var(--landing-bg);
		}

		/* The photo runs the full height of the shell, footer included, so the
		   phone gets the same one-surface hero the desktop does. It used to
		   stop at 124vh under a mask and dissolve into the paper ground, which
		   put a light band with dark text under a dark hero — two treatments
		   on one page, and the seam was visible. */
		.sky {
			bottom: 0;
			height: auto;
		}

		/* One flat wash over the whole photo. The desktop gradient cannot work
		   here: .left-head carries its own plate directly beneath the wordmark
		   row, so a fading top band crossed it and read as a dark strip above a
		   lighter one. Flat is also honest about what the phone layout is —
		   the copy block fills the screen, so there is no middle of the
		   photograph left to give back. */
		.sky-scrim {
			background: var(--landing-plate);
		}

		.intro {
			position: relative;
			top: auto;
			left: auto;
			z-index: 1;
			order: 1;
			padding: var(--space-5) var(--space-5) 0;
		}

		/* display:contents lets the headline and the footer be ordered
		   independently — the headline belongs to the hero screen, the footer
		   to the very bottom of the page. It also means .left is no longer a
		   box, so its plate has to move onto .left-head, which still is one. */
		.left { display: contents; }
		.left::before { display: none; }

		/* Same treatment, at the phone's narrower inset. */
		.left-links {
			top: var(--space-5);
			right: var(--space-5);
		}

		/* One row would put a 40-character line below body-copy size on a
		   phone, so it wraps here and keeps the display scale instead. */
		.left-title {
			white-space: normal;
			font-size: clamp(2.1rem, 10.5vw, 3rem);
		}

		.left-head {
			/* Static, so the actions below can anchor to .shell and share the
			   wordmark's line rather than this block's top edge. z-index still
			   applies: this is a flex item of .shell, and flex items honour
			   z-index without being positioned. */
			position: static;
			z-index: 1;
			/* No plate of its own: .sky-scrim is a flat wash at the same
			   strength across the whole photo here, so a second one would
			   double up and show as a seam at this block's top edge. */
			order: 2;
			/* The headline and the three paragraphs have to sit inside the
			   first screen, so the block is capped at the viewport less the
			   wordmark row above it, and can scroll internally on a short
			   phone. */
			min-height: calc(100vh - 92px);
			max-height: calc(100vh - 92px);
			overflow-y: auto;
			/* Starts the copy below the wordmark row with room to breathe,
			   rather than immediately under it. The block scrolls internally
			   if the copy runs past the screen. */
			padding-top: calc(var(--space-10) + var(--space-6));
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			margin: 0;
			padding-right: var(--space-5);
			padding-bottom: var(--space-6);
			padding-left: var(--space-5);
			box-sizing: border-box;
		}

		/* The footer sits on the photo like everything else now, so it keeps
		   the light ink and the halo rather than flipping to dark-on-paper. */
		.site-footer {
			position: relative;
			z-index: 1;
			order: 4;
			margin: var(--space-8) var(--space-5) 0;
			padding: var(--space-4) 0 var(--space-6);
		}

		/* Keep the mobile footer to the four site sections; the social links
		   would wrap onto a second row for little benefit. */
		.footer-link.is-social { display: none; }
	}
</style>

<script lang="ts">
	import { membershipErrorMessage } from '$lib/utils/membership-error.js';
	import { PROTECTED_ACTIONS, PROTECTED_ACTION_META } from '$lib/domain/gating.js';

	// Each opens the REAL /membership page in that state (dev preview data).
	const states = [
		{ label: 'Guest — never a member', href: '/membership?preview=guest' },
		{ label: 'Lapsed — had a membership', href: '/membership?preview=lapsed' },
		{ label: 'Active — subscription', href: '/membership?preview=active' },
		{ label: 'Lifetime', href: '/membership?preview=lifetime' },
		{ label: 'Comp / granted (no Stripe)', href: '/membership?preview=comp' },
		{ label: 'Confirming — just paid', href: '/membership?preview=guest&status=success' },
		{ label: 'Cancelled checkout', href: '/membership?preview=guest&status=cancelled' }
	];

	// The inline prompt a member sees when a gated action is blocked. Same wording
	// for every gated action; only join vs renew differs (driven by had_membership).
	const gatePrompts = [
		{ when: 'never a member → join', msg: membershipErrorMessage({ error: 'membership_required', had_membership: false }, '') },
		{ when: 'lapsed member → renew', msg: membershipErrorMessage({ error: 'membership_required', had_membership: true }, '') }
	];
	const gatedActions = PROTECTED_ACTIONS.map((a) => PROTECTED_ACTION_META[a].label);
</script>

<svelte:head><title>Membership states — dev</title></svelte:head>

<main class="dev">
	<p class="tag">dev only · 404 in production</p>
	<h1>Membership states</h1>
	<p class="note">Each link opens the real <code>/membership</code> page in that state (preview data; works in <code>npm run dev</code> only). Edit the page/copy and refresh to see your change.</p>

	<h2>Page states</h2>
	<ul class="list">
		{#each states as s (s.href)}
			<li><a href={s.href}>{s.label}</a> <code>{s.href}</code></li>
		{/each}
	</ul>

	<h2>Gated-action prompt</h2>
	<p class="note">Shown inline (replacing the submit button) when a non-member attempts a gated action. The half-written input is preserved.</p>
	<ul class="list">
		{#each gatePrompts as p (p.when)}
			<li><strong>{p.when}:</strong> &ldquo;{p.msg}&rdquo;</li>
		{/each}
	</ul>
	<p class="note">Actions an operator can gate: {gatedActions.join(' · ')}. They surface on a conversation (respond / invite) and at accept time.</p>

	<h2>Reference</h2>
	<ul class="list">
		<li>The contributor guide: <code>MEMBERSHIP_UI_GUIDE.md</code> at the repo root</li>
	</ul>
</main>

<style>
	.dev { max-width: 42rem; margin: 0 auto; padding: var(--space-6) var(--space-4); }
	.tag { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 var(--space-2); }
	h1 { font-size: var(--text-2xl); font-weight: 500; margin: 0 0 var(--space-2); }
	h2 { font-size: var(--text-lg); font-weight: 500; margin: var(--space-6) 0 var(--space-2); }
	.note { font-size: var(--text-sm); color: var(--text-muted); line-height: var(--leading-relaxed); margin: 0 0 var(--space-3); }
	.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
	.list li { font-size: var(--text-base); line-height: var(--leading-normal); }
	.list a { color: var(--text-link); text-decoration: underline; }
	.list a:hover { color: var(--text-link-hover); }
	code { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
</style>

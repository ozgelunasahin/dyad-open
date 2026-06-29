<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { invalidate } from '$app/navigation';
	import { copy } from '$lib/copy';

	let { data } = $props();

	const c = copy.membership;
	type Cadence = 'monthly' | 'annual' | 'lifetime';
	type Plan = { id: string; cadence: Cadence; name: string; price: string; period: string; icon: string; note?: string; badge?: string; save?: string };
	const PLANS: Plan[] = [
		{ id: 'solidarity', cadence: 'monthly', name: c.monthlySolidarityName, price: c.monthlySolidarityPrice, period: c.cadenceMonthlyPeriod, note: c.monthlySolidarityNote, icon: '🌱' },
		{ id: 'standard', cadence: 'monthly', name: c.monthlyStandardName, price: c.cadenceMonthlyPrice, period: c.cadenceMonthlyPeriod, note: c.monthlyStandardNote, icon: '🌿' },
		{ id: 'supporter', cadence: 'monthly', name: c.monthlySupporterName, price: c.monthlySupporterPrice, period: c.cadenceMonthlyPeriod, note: c.monthlySupporterNote, icon: '🌳' },
		{ id: 'annual', cadence: 'annual', name: c.cadenceAnnual, price: c.cadenceAnnualPrice, period: c.cadenceAnnualPeriod, badge: c.annualBadge, save: c.annualSave, icon: '⭐️' },
		{ id: 'lifetime', cadence: 'lifetime', name: c.cadenceLifetime, price: c.cadenceLifetimePrice, period: c.cadenceLifetimePeriod, icon: '♾️' }
	];

	let selected = $state('standard');
	const selectedCadence = $derived(PLANS.find((p) => p.id === selected)?.cadence ?? 'monthly');
	const monthlyPlans = PLANS.filter((p) => p.cadence === 'monthly');
	const otherPlans = PLANS.filter((p) => p.cadence !== 'monthly');
	let busy = $state(false);
	let error = $state('');
	let pollFallback = $state(false);

	const membership = $derived(data.membership);
	const status = $derived($page.url.searchParams.get('status'));
	const isActive = $derived(membership?.active === true);
	const isLifetime = $derived(isActive && membership?.cadence === 'lifetime');
	const isLapsed = $derived(!isActive && membership !== null);
	// While confirming a just-completed checkout the webhook may not have landed.
	const confirming = $derived(status === 'success' && !isActive && !pollFallback);

	async function startCheckout(cadence: Cadence) {
		busy = true;
		error = '';
		try {
			const res = await fetch('/api/membership/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cadence })
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok && body.url) {
				window.location.href = body.url; // full-page redirect to Stripe
				return;
			}
			error = c.errorGeneric;
		} catch {
			error = copy.common.networkError;
		} finally {
			busy = false;
		}
	}

	async function openPortal() {
		busy = true;
		error = '';
		try {
			const res = await fetch('/api/membership/portal', { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (res.ok && body.url) {
				window.location.href = body.url;
				return;
			}
			error = c.errorGeneric;
		} catch {
			error = copy.common.networkError;
		} finally {
			busy = false;
		}
	}

	// Poll for the webhook to flip `active` after a successful checkout return.
	onMount(() => {
		if (status !== 'success' || isActive) return;
		let elapsed = 0;
		const iv = setInterval(async () => {
			elapsed += 3000;
			await invalidate('membership:status');
			if (data.membership?.active) {
				clearInterval(iv);
			} else if (elapsed >= 30000) {
				clearInterval(iv);
				pollFallback = true;
			}
		}, 3000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>{c.pageTitle} — dyad</title>
</svelte:head>

{#snippet planCard(p: Plan)}
	<button
		type="button"
		class="plan"
		class:selected={selected === p.id}
		role="radio"
		aria-checked={selected === p.id}
		disabled={busy}
		onclick={() => (selected = p.id)}
	>
		<span class="plan-head">
			<span class="plan-name">{p.name}</span>
			{#if p.badge}<span class="plan-badge">{p.badge}</span>{/if}
		</span>
		<span class="plan-price">{p.price} <span class="plan-period">{p.period}</span></span>
		{#if p.note}<span class="plan-note">{p.note}</span>{/if}
		{#if p.save}<span class="plan-save">{p.save}</span>{/if}
	</button>
{/snippet}

<main class="membership">
	{#if isLifetime}
		<h1>{c.activeHeading}</h1>
		<p class="lead">{c.lifetimeConfirmation}</p>
	{:else if isActive}
		<h1>{c.activeHeading}</h1>
		<p class="lead">{c.activeSubscription}</p>
		<button class="primary" disabled={busy} onclick={openPortal}>{c.manageCta}</button>
	{:else if confirming}
		<h1>{c.pageTitle}</h1>
		<p class="lead">{c.finishingUp}</p>
		<p class="spinner" aria-live="polite">…</p>
	{:else}
		{#if pollFallback}
			<p class="lead notice">{c.finishingUpFallback}</p>
		{:else if status === 'cancelled'}
			<p class="lead notice">{c.cancelled}</p>
		{/if}
		<h1>{isLapsed ? c.lapsedHeading : c.guestHeading}</h1>
		<p class="lead">{isLapsed ? c.lapsedIntro : c.guestIntro}</p>

		<div class="plans" role="radiogroup" aria-label="Membership plans">
			<div class="fan">
				{#each monthlyPlans as p (p.id)}
					{@render planCard(p)}
				{/each}
			</div>
			{#each otherPlans as p (p.id)}
				{@render planCard(p)}
			{/each}
		</div>

		<ul class="benefits" role="list">
			{#each c.benefits as b (b)}
				<li>{b}</li>
			{/each}
		</ul>

		<button class="primary block" disabled={busy} onclick={() => startCheckout(selectedCadence)}>
			{isLapsed ? c.gateCta(true) : c.becomeMemberCta}
		</button>
		<p class="billing-note">{c.billingNote}</p>

		{#if !isLapsed}
			<div class="or"><span>{c.orLabel}</span></div>
			<a class="visitor" href="/discover">{c.visitorCta}</a>
			<p class="visitor-note">{c.visitorNote}</p>
		{/if}
	{/if}

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
	{#if busy}
		<p class="busy" aria-live="polite">{c.continuing}</p>
	{/if}
</main>

<style>
	.membership {
		max-width: 64rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}
	h1 {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: 0 0 var(--space-3);
	}
	.lead {
		font-size: var(--text-base);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
		margin: 0 0 var(--space-5);
	}
	.notice {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		background: var(--bg-canvas);
		color: var(--text-primary);
	}
	.plans {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: var(--space-4);
		margin: 0 0 var(--space-5);
	}
	.fan {
		display: flex;
		align-items: flex-end;
	}
	.fan .plan {
		transform-origin: bottom center;
		transition: transform 0.15s ease;
	}
	.fan .plan:first-child {
		transform: rotate(-8deg);
		margin-right: -2rem;
	}
	.fan .plan:nth-child(2) {
		z-index: 1;
	}
	.fan .plan:last-child {
		transform: rotate(8deg);
		margin-left: -2rem;
	}
	.fan .plan:hover:not(:disabled),
	.fan .plan.selected {
		transform: rotate(0deg) translateY(-0.5rem);
		z-index: 2;
	}
	@media (max-width: 720px) {
		.plans {
			flex-direction: column;
			align-items: stretch;
		}
		.fan {
			flex-direction: column;
			gap: var(--space-3);
		}
		.fan .plan {
			transform: none;
			margin: 0;
		}
		.plan {
			width: 100%;
		}
	}
	.plan {
		width: 11rem;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		background: var(--bg-canvas);
		cursor: pointer;
	}
	.plan:hover:not(:disabled) {
		border-color: var(--text-primary);
	}
	.plan.selected {
		border-color: var(--text-primary);
		box-shadow: inset 0 0 0 1px var(--text-primary);
	}
	.plan:disabled {
		cursor: progress;
		opacity: 0.6;
	}
	.plan-head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.plan-name {
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--text-primary);
	}
	.plan-badge {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15em 0.6em;
		border-radius: 999px;
		background: var(--text-primary);
		color: var(--bg-canvas);
	}
	.plan-price {
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text-primary);
	}
	.plan-period {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--text-muted);
	}
	.plan-save {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.plan-note {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.benefits {
		list-style: none;
		max-width: 30rem;
		margin: 0 auto var(--space-5);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.benefits li {
		position: relative;
		padding-left: var(--space-5);
		font-size: var(--text-sm);
		color: var(--text-primary);
		line-height: var(--leading-normal);
	}
	.benefits li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--text-muted);
	}
	.billing-note {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-align: center;
		margin: var(--space-3) 0 0;
	}
	.primary.block {
		display: block;
		width: 100%;
		max-width: 30rem;
		margin: 0 auto;
		text-align: center;
		padding: var(--space-4);
		font-weight: 500;
	}
	.primary {
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-card);
		background: var(--text-primary);
		color: var(--bg-canvas);
		cursor: pointer;
	}
	.primary:disabled {
		cursor: progress;
		opacity: 0.6;
	}
	.error {
		font-size: var(--text-sm);
		color: var(--text-danger, #b03a2e);
		margin: var(--space-3) 0 0;
	}
	.busy {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: var(--space-3) 0 0;
	}
	.spinner {
		font-size: var(--text-xl);
		color: var(--text-muted);
	}
	.or {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: var(--space-5) 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.or::before,
	.or::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-link);
	}
	.visitor {
		display: block;
		width: 100%;
		max-width: 30rem;
		margin-inline: auto;
		text-align: center;
		padding: var(--space-4);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-card);
		background: var(--bg-canvas);
		color: var(--text-primary);
		text-decoration: none;
		font-weight: 500;
	}
	.visitor:hover {
		background: var(--text-primary);
		color: var(--bg-canvas);
	}
	.visitor-note {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: var(--space-3) 0 0;
		text-align: center;
	}
</style>

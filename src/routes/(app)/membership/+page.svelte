<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { invalidate } from '$app/navigation';
	import { copy } from '$lib/copy';

	let { data } = $props();

	const c = copy.membership;
	type Cadence = 'monthly' | 'annual' | 'lifetime';
	const CADENCES: { value: Cadence; label: string; hint: string }[] = [
		{ value: 'monthly', label: c.cadenceMonthly, hint: c.cadenceMonthlyHint },
		{ value: 'annual', label: c.cadenceAnnual, hint: c.cadenceAnnualHint },
		{ value: 'lifetime', label: c.cadenceLifetime, hint: c.cadenceLifetimeHint }
	];

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

		<ul class="cadences">
			{#each CADENCES as cad (cad.value)}
				<li>
					<button class="cadence" disabled={busy} onclick={() => startCheckout(cad.value)}>
						<span class="cadence-label">{cad.label}</span>
						<span class="cadence-hint">{cad.hint}</span>
					</button>
				</li>
			{/each}
		</ul>
		<p class="amount-note">{c.amountNote}</p>
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
		max-width: 32rem;
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
	.cadences {
		list-style: none;
		margin: 0 0 var(--space-4);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.cadence {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		background: var(--bg-canvas);
		cursor: pointer;
	}
	.cadence:hover:not(:disabled) {
		border-color: var(--text-primary);
	}
	.cadence:disabled {
		cursor: progress;
		opacity: 0.6;
	}
	.cadence-label {
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--text-primary);
	}
	.cadence-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.amount-note {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0;
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
</style>

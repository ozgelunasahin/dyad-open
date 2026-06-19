<script lang="ts">
	import { copy } from '$lib/copy';

	let { onDone, username = '' }: { onDone: () => void; username?: string } = $props();

	let step = $state(0);
	const totalSteps = 5;
	const isLast = $derived(step === totalSteps - 1);

	// The optional notifications step renders notificationOnboarding with
	// "preferences" as an inline link; split once on its {link} marker.
	const onboardingParts = copy.preferences.notificationOnboarding.split('{link}');

	function next() {
		if (!isLast) {
			step++;
		}
	}

	function skip() {
		onDone();
	}

	function finish() {
		onDone();
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
	<div class="modal">
		<div class="step-dots">
			{#each { length: totalSteps } as _, i}
				<span class="dot" class:active={i === step}></span>
			{/each}
		</div>

		{#if step === 0}
			<div class="content">
				<h2 id="onboarding-title">Hey{username ? ` ${username}` : ''}, welcome in.</h2>
				<p>This is a place on the web<br>to find people to talk to, in person.<br><br>We don't believe the internet replaces conversation. We use it to begin one.<br><br>You bring a conversation, a thought. We surface others who share what you think, or have been where you are.</p>
			</div>
			<div class="actions">
				<button class="cta-btn" onclick={next}>How does it work?</button>
				<button class="skip-btn" onclick={skip}>Skip</button>
			</div>

		{:else if step === 1}
			<div class="content">
				<h2 id="onboarding-title">Start online.</h2>
				<!-- Path 1: start your own -->
				<div class="how-block">
					<div class="how-row">
						<div class="how-icon-demo">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
							</svg>
						</div>
						<p class="how-heading">Create a conversation</p>
					</div>
					<p class="how-caption">Something's been on your mind. Write it down. There's someone else thinking about it too.</p>
				</div>

				<div class="divider-or">or</div>

				<!-- Path 2: respond to someone's conversation -->
				<div class="how-block">
					<div class="how-row">
						<div class="how-icon-demo">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
								<path d="M14 14l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
							</svg>
						</div>
						<p class="how-heading">Join one</p>
					</div>
					<p class="how-caption">Someone else has already started a conversation. Read it. Share your perspective.</p>
				</div>
			</div>
			<div class="actions">
				<button class="cta-btn" onclick={next}>Got it</button>
				<button class="skip-btn" onclick={skip}>Skip</button>
			</div>

		{:else if step === 2}
			<div class="content">
				<h2 id="onboarding-title">Take it offline.</h2>
				<p>You find people you want to meet<br>around what matters to you, and meet them here and now.</p>
				<p>We use the internet for its original intentions, to connect and share.</p>
			</div>
			<div class="actions">
				<button class="cta-btn" onclick={next}>Got it</button>
				<button class="skip-btn" onclick={skip}>Skip</button>
			</div>

		{:else if step === 3}
			<div class="content">
				<h2 id="onboarding-title">Hear back.</h2>
				<p>{onboardingParts[0] ?? ''}<a href="/profile/preferences" onclick={finish}>{copy.preferences.notificationPrefsLink}</a>{onboardingParts[1] ?? ''}</p>
			</div>
			<div class="actions">
				<button class="cta-btn" onclick={next}>Continue</button>
				<button class="skip-btn" onclick={skip}>Skip</button>
			</div>

		{:else}
			<div class="content">
				<h2 id="onboarding-title">Your move.</h2>
			</div>
			<div class="actions">
				<a href="/conversations/new" class="cta-btn" onclick={finish}>Start a conversation</a>
				<button class="secondary-btn" onclick={finish}>Explore</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: var(--space-4);
		padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.modal {
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		padding: var(--space-8) var(--space-6);
		width: 100%;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.step-dots {
		display: flex;
		gap: var(--space-2);
		justify-content: center;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--border-link);
		transition: background 0.2s;
	}

	.dot.active {
		background: var(--text-primary);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	h2 {
		margin: 0;
		font-size: var(--text-2xl);
		font-weight: 300;
		color: var(--text-primary);
		line-height: 1.2;
	}

	p {
		margin: 0;
		font-size: var(--text-md);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	/* Inline "preferences" link in the optional notifications step. */
	.content p a {
		color: var(--text-primary);
		text-decoration: underline;
		text-decoration-color: var(--border-link);
		transition: text-decoration-color 0.15s;
	}

	.content p a:hover {
		text-decoration-color: currentColor;
	}

	/* Step 2 specific */
	.how-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.convo-card {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-card);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.convo-text {
		margin: 0;
		font-size: var(--text-md);
		color: var(--text-primary);
		font-style: italic;
		line-height: 1.5;
	}

	.convo-meta {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.how-heading {
		margin: 0;
		font-size: var(--text-md);
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.how-caption {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.how-closing {
		margin: 0;
		font-size: var(--text-md);
		color: var(--text-primary);
		line-height: 1.6;
		font-style: italic;
	}

	.divider-or {
		text-align: center;
		font-size: var(--text-sm);
		color: var(--text-muted);
		position: relative;
	}

	.divider-or::before,
	.divider-or::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: var(--border-link);
	}

	.divider-or::before { left: 0; }
	.divider-or::after { right: 0; }

	.how-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.how-icon-demo {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--text-primary);
		color: var(--bg-canvas);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Actions */
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.cta-btn {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-pill);
		font-size: var(--text-md);
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
		text-align: center;
		text-decoration: none;
		display: block;
		box-sizing: border-box;
	}

	.cta-btn:hover {
		opacity: var(--opacity-hover-btn);
	}

	.secondary-btn {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: none;
		color: var(--text-primary);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-pill);
		font-size: var(--text-md);
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.secondary-btn:hover {
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
	}

	.skip-btn {
		background: none;
		border: none;
		font-size: var(--text-sm);
		color: var(--text-muted);
		cursor: pointer;
		font-family: inherit;
		padding: 0;
		text-align: center;
	}

	.skip-btn:hover {
		color: var(--text-secondary);
	}
</style>

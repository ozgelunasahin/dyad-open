<script lang="ts">
	/**
	 * Discover spaces — the community exploration channel. Browse the city's
	 * communities by access type: Open (anyone joins), Intimate (discoverable but
	 * curated — organiser reviews each application), and Private (closed,
	 * invite-only, shown locked). Ported from the landing-redesign scoping work.
	 *
	 * Mount once and toggle `open`:
	 *   <ExploreCommunities bind:open={exploreOpen} />
	 */
	type SpaceType = 'open' | 'intimate' | 'private';
	interface Space {
		id: string;
		name: string;
		type: SpaceType;
		accentColor: string | null;
		description: string | null;
		questions: string[];
	}

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let query = $state('');
	let applyingTo = $state<{ name: string; description: string; questions: string[] } | null>(null);
	let applicationSubmitted = $state(false);

	const discoverableSpaces: Space[] = [
		// ── Open: anyone can join ─────────────────────────────────────────
		{ id: 'cassette-heads', name: 'Cassette Heads Sessions', type: 'open', accentColor: '#c8a86b',
			description: 'A music collective meeting in Berlin to listen, discuss, and share — from ambient to noise, vinyl to tape. No elitism. Just ears.', questions: [] },
		{ id: 'kreuzberg-reads', name: 'Kreuzberg Reads', type: 'open', accentColor: '#7a9e7e',
			description: 'A neighbourhood reading community. Books, essays, ideas — one conversation at a time, usually on a Thursday.', questions: [] },
		{ id: 'rebuild-eu', name: 'Rebuild', type: 'open', accentColor: '#6b7fa8',
			description: 'A pan-European sprint to strengthen the social platform ecosystem for digital sovereignty.', questions: [] },
		{ id: 'sunday-swimmers', name: 'Sunday Swimmers', type: 'open', accentColor: '#4f8fa8',
			description: 'Cold-water swimming at the Berlin lakes, year round. We meet at sunrise, swim, and warm up over coffee. Beginners and shiverers welcome.', questions: [] },
		{ id: 'repair-cafe', name: 'Neukölln Repair Café', type: 'open', accentColor: '#a8794f',
			description: 'Bring something broken — a toaster, a bike, a jacket — and fix it together with neighbours who know how. Throwing away is the last resort.', questions: [] },
		{ id: 'newcomers-table', name: "Newcomers' Table", type: 'open', accentColor: '#5fa87a',
			description: 'New to Berlin? So is everyone here. A weekly table for people finding their feet in the city — no German required, no agenda.', questions: [] },
		{ id: 'plant-swap', name: 'Balcony Botanists', type: 'open', accentColor: '#6fa84f',
			description: "Cuttings, seeds, and over-watering confessions. We swap plants and advice across the city's balconies and Kleingärten.", questions: [] },
		// ── Intimate: discoverable but curated entry ──────────────────────
		{ id: 'yes-we-bleed', name: 'Yes We Bleed', type: 'intimate', accentColor: '#b05060',
			description: "A space for menstrual justice advocates, researchers, and community organisers. We gather in Berlin to share resources, organise campaigns, and support each other's work. Entry is curated — we review each application to keep the space intentional.",
			questions: [
				'How does menstrual justice connect to your work or personal experience?',
				'What would you bring to this community?',
				'Have you been part of a similar collective before? Tell us a little about it.'
			] },
		{ id: 'philosophy-xberg', name: 'Philosophy in Xberg', type: 'intimate', accentColor: '#8a6fa8',
			description: 'Monthly philosophy conversations in Kreuzberg. We read texts together and think out loud. Curated for people who show up consistently.',
			questions: [
				'What philosophical question keeps coming back to you?',
				'What does showing up to a reading group mean to you?'
			] },
		{ id: 'mother-tongues', name: 'Mother Tongues', type: 'intimate', accentColor: '#a8884f',
			description: 'For people raising children between languages. We share the small daily negotiations of bilingual family life. Curated to keep the circle of trust small.',
			questions: [
				'Which languages live in your household, and how do they share the space?',
				'What do you hope to find in a group like this?'
			] },
		{ id: 'first-gen-founders', name: 'First-Gen Builders', type: 'intimate', accentColor: '#5f7aa8',
			description: 'Founders and makers who are first in their family to do this. We talk about the things accelerators skip — money, family, doubt. Applications reviewed personally.',
			questions: [
				'What are you building, and what does "first-gen" mean to you?',
				'What conversation are you not able to have anywhere else right now?'
			] },
		{ id: 'grief-circle', name: 'The Tuesday Circle', type: 'intimate', accentColor: '#7a6fa8',
			description: "A quiet, facilitated space for people moving through grief and loss. We meet, we listen, we don't fix. Entry is gently curated to protect the room.",
			questions: [
				'What brings you to a space like this, if you feel able to share?',
				'Have you been part of a held space before?'
			] },
		// ── Private: closed, undiscoverable — shown as locked ─────────────
		{ id: 'private-1', name: '', type: 'private', accentColor: null, description: null, questions: [] },
		{ id: 'private-2', name: '', type: 'private', accentColor: null, description: null, questions: [] },
		{ id: 'private-3', name: '', type: 'private', accentColor: null, description: null, questions: [] }
	];

	function matches(s: Space): boolean {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return (s.name + ' ' + (s.description ?? '')).toLowerCase().includes(q);
	}
	const openSpaces = $derived(discoverableSpaces.filter((s) => s.type === 'open' && matches(s)));
	const intimateSpaces = $derived(discoverableSpaces.filter((s) => s.type === 'intimate' && matches(s)));
	const privateSpaces = $derived(discoverableSpaces.filter((s) => s.type === 'private'));

	function close() {
		open = false;
		applyingTo = null;
		applicationSubmitted = false;
		query = '';
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={close}>
		<div class="discover-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			{#if applicationSubmitted}
				<div class="pending-screen">
					<div class="pending-card">
						<span class="pending-logo">dyad.</span>
						<h2 class="pending-title">Membership pending</h2>
						<p class="pending-desc">Your answer has been submitted. The organiser will review your request and you'll receive a confirmation soon.</p>
						<p class="pending-meantime">In the meantime:</p>
						<a href="/conversations/new" class="pending-btn" onclick={close}>Start a conversation</a>
						<button class="pending-link" onclick={() => { applicationSubmitted = false; applyingTo = null; }}>Explore more spaces</button>
					</div>
				</div>
			{:else if applyingTo}
				<div class="modal-header">
					<h2 class="modal-title">Apply to join</h2>
					<button class="modal-close" onclick={() => (applyingTo = null)} aria-label="Back">← back</button>
				</div>
				<div class="apply-form">
					<p class="apply-community-name">{applyingTo.name}</p>
					<p class="apply-description">{applyingTo.description}</p>
					{#each applyingTo.questions as q, i}
						<div class="apply-field">
							<label class="apply-label" for="q{i}">{q}</label>
							<textarea id="q{i}" class="apply-textarea" rows="3" placeholder="Your answer..."></textarea>
						</div>
					{/each}
					<button class="apply-submit" onclick={() => { applyingTo = null; applicationSubmitted = true; }}>
						Submit application
					</button>
				</div>
			{:else}
				<div class="modal-header">
					<h2 class="modal-title">Discover spaces</h2>
					<button class="modal-close" onclick={close} aria-label="Close">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
				</div>

				<div class="discover-search">
					<svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
					<input type="text" placeholder="Search spaces..." class="search-input" bind:value={query} />
				</div>

				<div class="discover-list">
					<!-- Open -->
					<div class="ds-section-head">
						<span class="ds-section-title">Open</span>
						<span class="ds-section-note">Anyone can join instantly.</span>
					</div>
					{#each openSpaces as space}
						<div class="ds-row">
							<div class="ds-avatar" style="background: {space.accentColor}18; border-color: {space.accentColor}30;">
								<span class="ds-avatar-initial" style="color: {space.accentColor};">{space.name[0]}</span>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name">{space.name}</span>
									<span class="ds-badge ds-badge--open">Open</span>
								</div>
								<p class="ds-desc">{space.description}</p>
							</div>
							<button class="ds-action ds-action--join" onclick={close}>Join</button>
						</div>
					{/each}

					<!-- Intimate -->
					<div class="ds-section-head ds-section-head--spaced">
						<span class="ds-section-title">Intimate spaces</span>
						<span class="ds-section-note">Discoverable but curated — organiser reviews each application.</span>
					</div>
					{#each intimateSpaces as space}
						<div class="ds-row">
							<div class="ds-avatar" style="background: {space.accentColor}18; border-color: {space.accentColor}30;">
								<span class="ds-avatar-initial" style="color: {space.accentColor};">{space.name[0]}</span>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name">{space.name}</span>
									<span class="ds-badge ds-badge--intimate">Curated</span>
								</div>
								<p class="ds-desc">{space.description}</p>
							</div>
							<button
								class="ds-action ds-action--apply"
								onclick={() => (applyingTo = { name: space.name, description: space.description ?? '', questions: space.questions ?? [] })}
							>Apply</button>
						</div>
					{/each}

					<!-- Private -->
					<div class="ds-section-head ds-section-head--spaced">
						<span class="ds-section-title">Private</span>
						<span class="ds-section-note">Closed and undiscoverable. Accessible by invitation only.</span>
					</div>
					{#each privateSpaces as _space}
						<div class="ds-row ds-row--private">
							<div class="ds-avatar ds-avatar--private">
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name ds-name--private">Private space</span>
									<span class="ds-badge ds-badge--private">Invite only</span>
								</div>
								<p class="ds-desc ds-desc--private">This space is hidden and accessible by invitation only.</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
	}

	.discover-modal {
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		width: 680px;
		max-width: calc(100vw - 32px);
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 24px 64px rgba(0,0,0,0.2);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 24px 16px;
		position: sticky;
		top: 0;
		background: var(--bg-canvas);
		border-bottom: 1px solid var(--border-link);
	}

	.modal-title {
		font-family: var(--font-serif);
		font-size: 1.3rem;
		font-weight: 400;
		margin: 0;
		color: var(--text-primary);
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 4px 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: color 0.15s;
	}
	.modal-close:hover { color: var(--text-primary); }

	.discover-search {
		padding: 14px 20px;
		border-bottom: 1px solid var(--border-link);
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.search-icon { color: var(--text-muted); flex-shrink: 0; }
	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
	}
	.search-input::placeholder { color: var(--text-muted); }

	.discover-list { padding: 0 0 16px; }

	.ds-section-head {
		padding: 20px 20px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.ds-section-head--spaced {
		padding-top: 28px;
		border-top: 1px solid var(--border-link);
		margin-top: 8px;
	}
	.ds-section-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
	.ds-section-note {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.ds-row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 20px;
		transition: background 0.12s;
	}
	.ds-row:hover { background: var(--bg-control); }
	.ds-row--private { opacity: 0.45; pointer-events: none; }

	.ds-avatar {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		border: 1px solid var(--border-link);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.ds-avatar--private {
		background: var(--bg-control);
		border-color: var(--border-link);
		color: var(--text-muted);
	}
	.ds-avatar-initial { font-family: var(--font-serif); font-size: 16px; font-weight: 400; }

	.ds-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
	.ds-name-row { display: flex; align-items: center; gap: 8px; }
	.ds-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ds-name--private { color: var(--text-muted); }

	.ds-badge {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		white-space: nowrap;
		flex-shrink: 0;
	}
	.ds-badge--open { background: rgba(61,158,90,0.1); color: var(--color-success); }
	.ds-badge--intimate { background: rgba(160,96,64,0.1); color: #a06040; }
	.ds-badge--private { background: var(--bg-control); color: var(--text-muted); border: 1px dashed var(--border-link); }

	.ds-desc {
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-muted);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ds-desc--private { opacity: 0.6; }

	.ds-action {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 6px 14px;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s, background 0.15s;
	}
	.ds-action--join { background: var(--text-primary); color: var(--bg-canvas); border: none; }
	.ds-action--join:hover { opacity: 0.8; }
	.ds-action--apply { background: none; color: var(--text-primary); border: 1px solid var(--border-link); }
	.ds-action--apply:hover { background: var(--bg-control); }

	.pending-screen {
		min-height: 360px;
		background: linear-gradient(135deg, #1a1040 0%, #0d1a2e 50%, #1a2010 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
	}
	.pending-card {
		background: rgba(10,10,10,0.85);
		border-radius: var(--radius-card);
		padding: 40px 36px;
		max-width: 400px;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.pending-logo {
		font-family: var(--font-serif);
		font-size: 1rem;
		color: rgba(255,255,255,0.6);
		margin-bottom: 4px;
	}
	.pending-title { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 400; color: #fff; margin: 0; }
	.pending-desc { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.65); margin: 0; max-width: 100%; }
	.pending-meantime {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.4);
		margin: 8px 0 0;
	}
	.pending-btn {
		display: block;
		width: 100%;
		background: rgba(255,255,255,0.12);
		color: #fff;
		border: 1px solid rgba(255,255,255,0.2);
		border-radius: var(--radius-input);
		padding: 12px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.06em;
		cursor: pointer;
		text-decoration: none;
		text-align: center;
		transition: background 0.15s;
	}
	.pending-btn:hover { background: rgba(255,255,255,0.18); }
	.pending-link {
		background: none;
		border: none;
		color: rgba(255,255,255,0.45);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 4px;
		transition: color 0.15s;
	}
	.pending-link:hover { color: rgba(255,255,255,0.75); }

	.apply-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
	.apply-community-name { font-family: var(--font-serif); font-size: 1.1rem; color: var(--text-primary); margin: 0; }
	.apply-description { font-size: 13px; line-height: 1.6; color: var(--text-muted); margin: 0; }
	.apply-field { display: flex; flex-direction: column; gap: 8px; }
	.apply-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em; color: var(--text-primary); }
	.apply-textarea {
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		padding: 10px 12px;
		font-family: inherit;
		font-size: 13px;
		color: var(--text-primary);
		resize: vertical;
		outline: none;
	}
	.apply-textarea:focus { border-color: var(--line-color); }
	.apply-submit {
		align-self: flex-start;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		padding: 10px 24px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.apply-submit:hover { opacity: 0.82; }

	@media (max-width: 768px) {
		.discover-modal {
			width: 100%;
			max-width: 100%;
			max-height: 92vh;
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			margin-top: auto;
		}
		.modal-backdrop { align-items: flex-end; }
	}
</style>

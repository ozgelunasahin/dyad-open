<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { JSONContent } from '@tiptap/core';
	import type { LocationRef, TimeSlotInput } from '$lib/domain/types';

	let { data }: { data: PageData } = $props();

	// ── Editable state ─────────────────────────────────────────────────────────
	let title = $state(data.prompt.title ?? '');
	let body = $state<JSONContent>(data.prompt.body ?? { type: 'doc', content: [{ type: 'paragraph' }] });
	let coverImageUrl = $state(data.prompt.cover_image_url ?? '');
	let coverPreview = $state<string | null>(null);

	// ── Auto-save ──────────────────────────────────────────────────────────────
	let saveGeneration = 0;
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	async function saveNow() {
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		const gen = ++saveGeneration;
		saveStatus = 'saving';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title || null,
					body,
					coverImageUrl: coverImageUrl || null
				})
			});
			if (gen !== saveGeneration) return;
			saveStatus = res.ok ? 'saved' : 'error';
		} catch {
			if (gen !== saveGeneration) return;
			saveStatus = 'error';
		}
	}

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveStatus = 'idle';
		saveTimer = setTimeout(saveNow, 1500);
	}

	// ── Navigation guard ───────────────────────────────────────────────────────
	beforeNavigate((navigation) => {
		if (!saveTimer) return;
		if (navigation.willUnload) { navigation.cancel(); return; }
		navigation.cancel();
		saveNow().then(() => {
			if (navigation.to?.url) goto(navigation.to.url.pathname);
		});
	});

	onMount(() => {
		const handler = () => { if (saveTimer) { /* browser shows native dialog */ } };
		window.addEventListener('beforeunload', handler);
		return () => {
			window.removeEventListener('beforeunload', handler);
			if (saveTimer) clearTimeout(saveTimer);
			if (coverPreview) URL.revokeObjectURL(coverPreview);
		};
	});

	// ── Editor update handler ──────────────────────────────────────────────────
	function handleEditorUpdate(json: JSONContent) {
		body = json;
		scheduleSave();
	}

	function handleTitleInput() {
		scheduleSave();
	}

	// ── Cover image ────────────────────────────────────────────────────────────
	let uploading = $state(false);

	async function handleCoverUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (coverPreview) URL.revokeObjectURL(coverPreview);
		coverPreview = URL.createObjectURL(file);

		uploading = true;
		const formData = new FormData();
		formData.append('file', file);
		try {
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			if (res.ok) {
				const { url } = await res.json();
				coverImageUrl = url;
				scheduleSave();
			}
		} finally {
			uploading = false;
		}
	}

	// ── Scheduling ─────────────────────────────────────────────────────────────
	interface SlotDraft {
		date: string;
		time: string;
		duration: number;
		locationQuery: string;
		location: LocationRef | null;
		locationResults: Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>;
	}

	let slotDrafts = $state<SlotDraft[]>([{
		date: new Date().toLocaleDateString('sv-SE'),
		time: '19:00',
		duration: 60,
		locationQuery: '',
		location: null,
		locationResults: []
	}]);

	// Rolling 7-day calendar
	const weekDates = (() => {
		const today = new Date();
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
			return {
				date: d.toLocaleDateString('sv-SE'),
				dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
				dayNum: d.getDate()
			};
		});
	})();

	function addSlot() {
		if (slotDrafts.length >= 3) return;
		slotDrafts = [...slotDrafts, {
			date: weekDates[0].date,
			time: '19:00',
			duration: 60,
			locationQuery: '',
			location: null,
			locationResults: []
		}];
	}

	function removeSlot(index: number) {
		slotDrafts = slotDrafts.filter((_, i) => i !== index);
	}

	// Location search
	let searchTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

	async function searchLocation(index: number, query: string) {
		slotDrafts[index].locationQuery = query;
		slotDrafts = [...slotDrafts]; // trigger reactivity

		const existing = searchTimers.get(index);
		if (existing) clearTimeout(existing);

		if (query.length < 2) {
			slotDrafts[index].locationResults = [];
			slotDrafts = [...slotDrafts];
			return;
		}

		searchTimers.set(index, setTimeout(async () => {
			try {
				const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&region=berlin`);
				if (res.ok) {
					const results = await res.json();
					slotDrafts[index].locationResults = results;
					slotDrafts = [...slotDrafts];
				}
			} catch { /* ignore */ }
		}, 250));
	}

	function selectLocation(index: number, result: SlotDraft['locationResults'][0]) {
		slotDrafts[index].location = result;
		slotDrafts[index].locationQuery = result.name;
		slotDrafts[index].locationResults = [];
		slotDrafts = [...slotDrafts];
	}

	// ── Publish ────────────────────────────────────────────────────────────────
	let publishing = $state(false);
	let publishError = $state('');

	async function handlePublish() {
		publishError = '';

		if (!title.trim()) { publishError = 'Title is required to publish.'; return; }

		const validSlots = slotDrafts.filter(s => s.location);
		if (validSlots.length === 0) { publishError = 'At least one slot with a location is required.'; return; }

		publishing = true;

		// Flush pending auto-save first
		await saveNow();

		const slots: TimeSlotInput[] = validSlots.map(s => ({
			start_time: new Date(`${s.date}T${s.time}`).toISOString(),
			duration_minutes: s.duration,
			location: s.location!
		}));

		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/publish`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slots })
			});
			if (res.ok) {
				goto(`/prompts/${data.prompt.id}/edit`, { invalidateAll: true });
			} else {
				const err = await res.json().catch(() => ({}));
				publishError = (err as any).error ?? 'Failed to publish';
			}
		} catch {
			publishError = 'Network error. Please try again.';
		} finally {
			publishing = false;
		}
	}

	// ── Unpublish ──────────────────────────────────────────────────────────────
	async function handleUnpublish() {
		const res = await fetch(`/api/prompts/${data.prompt.id}/unpublish`, { method: 'POST' });
		if (res.ok) goto(`/prompts/${data.prompt.id}/edit`, { invalidateAll: true });
	}

	let isDraft = $derived(data.prompt.state === 'draft');
	let isPublished = $derived(data.prompt.state === 'published');
</script>

<svelte:head>
	<title>{title || 'Edit prompt'} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<!-- Save status -->
	<div class="save-status">
		{#if saveStatus === 'saving'}
			<span class="status saving">Saving...</span>
		{:else if saveStatus === 'saved'}
			<span class="status saved">Saved</span>
		{:else if saveStatus === 'error'}
			<span class="status error">Save failed</span>
		{/if}
	</div>

	<!-- Title -->
	<input
		class="title-input"
		type="text"
		bind:value={title}
		oninput={handleTitleInput}
		placeholder="Give your prompt a title..."
		maxlength={200}
	/>

	<!-- Cover image -->
	<div class="cover-section">
		{#if coverPreview || coverImageUrl}
			<img src={coverPreview || coverImageUrl} alt="Cover" class="cover-preview" />
		{/if}
		<label class="cover-upload-btn">
			{uploading ? 'Uploading...' : (coverImageUrl ? 'Change cover image' : 'Add cover image')}
			<input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleCoverUpload} class="sr-only" />
		</label>
	</div>

	<!-- TipTap Editor -->
	{#await import('$lib/components/PromptEditor.svelte')}
		<div class="editor-loading">Loading editor...</div>
	{:then { default: PromptEditor }}
		<PromptEditor content={body} onUpdate={handleEditorUpdate} />
	{:catch}
		<p class="error">Failed to load editor.</p>
	{/await}

	<!-- Scheduling (draft only) -->
	{#if isDraft}
		<section class="scheduling">
			<h2 class="section-title">Schedule meeting slots</h2>
			<p class="section-desc">Pick up to 3 times when you're available to meet.</p>

			{#each slotDrafts as slot, i}
				<div class="slot-row">
					<select bind:value={slot.date} onchange={() => slotDrafts = [...slotDrafts]}>
						{#each weekDates as day}
							<option value={day.date}>{day.dayShort} {day.dayNum}</option>
						{/each}
					</select>

					<input type="time" bind:value={slot.time} onchange={() => slotDrafts = [...slotDrafts]} />

					<select bind:value={slot.duration} onchange={() => slotDrafts = [...slotDrafts]}>
						<option value={30}>30 min</option>
						<option value={45}>45 min</option>
						<option value={60}>1 hour</option>
						<option value={90}>1.5 hours</option>
					</select>

					<div class="location-search">
						<input
							type="text"
							placeholder="Search location..."
							value={slot.locationQuery}
							oninput={(e) => searchLocation(i, (e.target as HTMLInputElement).value)}
							role="combobox"
							aria-expanded={slot.locationResults.length > 0}
						/>
						{#if slot.location}
							<span class="location-badge">{slot.location.name}</span>
						{/if}
						{#if slot.locationResults.length > 0}
							<div class="location-dropdown">
								{#each slot.locationResults as result}
									<button type="button" class="location-option" onmousedown={() => selectLocation(i, result)}>
										<span class="loc-name">{result.name}</span>
										<span class="loc-addr">{result.address}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>

					{#if slotDrafts.length > 1}
						<button type="button" class="remove-slot" onclick={() => removeSlot(i)} title="Remove slot">&times;</button>
					{/if}
				</div>
			{/each}

			{#if slotDrafts.length < 3}
				<button type="button" class="add-slot" onclick={addSlot}>+ Add another slot</button>
			{/if}

			{#if publishError}
				<p class="publish-error">{publishError}</p>
			{/if}

			<button class="publish-btn" onclick={handlePublish} disabled={publishing}>
				{publishing ? 'Publishing...' : 'Publish prompt'}
			</button>
		</section>
	{/if}

	<!-- Published state management -->
	{#if isPublished}
		<section class="published-info">
			<h2 class="section-title">Published</h2>
			<p class="section-desc">Your prompt is live on the discover feed.</p>
			{#if data.slots.length > 0}
				<div class="slot-list">
					{#each data.slots as slot}
						<div class="existing-slot">
							<span>{new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
							<span>{new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
							<span>{slot.duration_minutes} min</span>
							<span class="slot-area">{slot.general_area}</span>
						</div>
					{/each}
				</div>
			{/if}
			<button class="unpublish-btn" onclick={handleUnpublish}>Unpublish</button>
		</section>
	{/if}
</div>

<style>
	.content { width: 100%; max-width: 700px; }

	.save-status { height: 24px; margin-bottom: 8px; }
	.status { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 12px; }
	.saving { color: var(--text-muted, #999); }
	.saved { color: #3d9e5a; }
	.error { color: #c00; }

	.title-input {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.8rem;
		font-weight: normal;
		color: var(--text-primary);
		border: none;
		background: transparent;
		width: 100%;
		padding: 0;
		margin-bottom: 20px;
		outline: none;
	}

	.title-input::placeholder { color: var(--text-muted, #bbb); }

	.cover-section { margin-bottom: 20px; }
	.cover-preview { width: 100%; max-height: 300px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; }
	.cover-upload-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		cursor: pointer;
		text-decoration: underline;
	}
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	.editor-loading {
		padding: 40px;
		text-align: center;
		color: var(--text-muted, #999);
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	/* Scheduling */
	.scheduling { margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }
	.section-title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.1rem; font-weight: normal; margin: 0 0 4px; color: var(--text-primary); }
	.section-desc { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.85rem; color: var(--text-muted, #666); margin: 0 0 20px; }

	.slot-row {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	.slot-row select, .slot-row input[type="time"] {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 8px 10px;
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
	}

	.location-search { position: relative; flex: 1; min-width: 180px; }
	.location-search input {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 8px 10px;
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
		width: 100%;
		box-sizing: border-box;
	}
	.location-badge {
		font-size: 11px;
		color: var(--text-muted, #666);
		display: block;
		margin-top: 2px;
	}
	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--border-link);
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
	}
	.location-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 8px 10px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
		cursor: pointer;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
	}
	.location-option:hover { background: var(--bg-control, rgba(0,0,0,0.03)); }
	.loc-name { color: var(--text-primary); display: block; }
	.loc-addr { color: var(--text-muted, #999); font-size: 11px; display: block; }

	.remove-slot {
		font-size: 18px;
		background: none;
		border: none;
		color: var(--text-muted, #999);
		cursor: pointer;
		padding: 6px;
	}
	.remove-slot:hover { color: #c00; }

	.add-slot {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-bottom: 20px;
		text-decoration: underline;
	}

	.publish-error { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; color: #c00; margin: 0 0 12px; }

	.publish-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 28px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--text-primary);
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.publish-btn:hover:not(:disabled) { opacity: 0.85; }
	.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Published state */
	.published-info { margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }
	.slot-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
	.existing-slot {
		display: flex;
		gap: 12px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-primary);
		padding: 8px 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
	}
	.slot-area { color: var(--text-muted, #666); text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
	.unpublish-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		background: none;
		border: 1px solid var(--border-link, rgba(0,0,0,0.15));
		border-radius: 6px;
		padding: 8px 16px;
		cursor: pointer;
	}
	.unpublish-btn:hover { border-color: var(--text-primary); color: var(--text-primary); }

	@media (max-width: 430px) {
		.slot-row { flex-direction: column; }
		.location-search { min-width: 100%; }
	}
</style>

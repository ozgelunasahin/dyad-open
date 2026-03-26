<script lang="ts">
	import { onMount } from 'svelte';
	import type { WeekDate } from '$lib/utils/dates';

	let {
		variant = 'discover',
		position = 'bottom',
		active = '',
		onMapClick,
		weekDates = [],
		selectedDays = new Set<string>(),
		onToggleDay,
		showDateFilter = false,
		// Editor variant props
		saveStatus = 'idle',
		onBack,
		onSaveDraft,
		onPublish,
	}: {
		variant?: 'discover' | 'editor';
		position?: 'top' | 'bottom';
		active?: string;
		onMapClick?: () => void;
		weekDates?: WeekDate[];
		selectedDays?: Set<string>;
		onToggleDay?: (date: string) => void;
		showDateFilter?: boolean;
		// Editor variant
		saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
		onBack?: () => void;
		onSaveDraft?: () => void;
		onPublish?: () => void;
	} = $props();

	let dateFilterOpen = $state(false);
	let continueDropdownOpen = $state(false);
	let dropdownRef: HTMLElement | undefined = $state();

	// Close dropdown on click outside
	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (continueDropdownOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
				continueDropdownOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside, true);
		return () => document.removeEventListener('click', handleClickOutside, true);
	});

	function handleContinueKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			continueDropdownOpen = false;
		} else if (e.key === 'ArrowDown' && continueDropdownOpen) {
			e.preventDefault();
			const first = dropdownRef?.querySelector('[role="menuitem"]') as HTMLElement;
			first?.focus();
		}
	}

	function handleMenuItemKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			continueDropdownOpen = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			const next = (e.target as HTMLElement).nextElementSibling as HTMLElement;
			next?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prev = (e.target as HTMLElement).previousElementSibling as HTMLElement;
			prev?.focus();
		}
	}
</script>

<nav class="floating-nav" class:top={position === 'top'} class:bottom={position === 'bottom'}>
	{#if variant === 'editor'}
		<!-- Editor variant: Back, Saved indicator, Continue dropdown -->
		<button class="back-text-btn" onclick={onBack} aria-label="Back">← Back</button>

		<span class="save-indicator">
			{#if saveStatus === 'saving'}
				<span class="save-dot saving"></span> Saving...
			{:else if saveStatus === 'saved'}
				<span class="save-dot saved"></span> Saved
			{:else if saveStatus === 'error'}
				<span class="save-dot error"></span> Error
			{:else}
				<span class="save-dot saved"></span> Saved
			{/if}
		</span>

		<span class="nav-spacer"></span>

		<div class="continue-wrapper" bind:this={dropdownRef}>
			<button
				class="continue-btn"
				onclick={() => continueDropdownOpen = !continueDropdownOpen}
				onkeydown={handleContinueKeydown}
				aria-haspopup="true"
				aria-expanded={continueDropdownOpen}
			>
				Continue
			</button>

			{#if continueDropdownOpen}
				<div class="continue-dropdown" role="menu">
					<button
						class="dropdown-item"
						role="menuitem"
						tabindex="-1"
						onkeydown={handleMenuItemKeydown}
						onclick={() => { continueDropdownOpen = false; onSaveDraft?.(); }}
					>
						Save as Draft
					</button>
					<button
						class="dropdown-item"
						role="menuitem"
						tabindex="-1"
						onkeydown={handleMenuItemKeydown}
						onclick={() => { continueDropdownOpen = false; onPublish?.(); }}
					>
						Publish as Conversation
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Discover variant (default) -->
		<button
			class="nav-btn"
			class:active-icon={active === 'map'}
			onclick={onMapClick}
			aria-label={active === 'map' ? 'List view' : 'Map view'}
		>
			{#if active === 'map'}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M1 4l5 2 6-2 6 2v12l-6-2-6 2-5-2V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
					<path d="M6 6v12M12 4v12" stroke="currentColor" stroke-width="1.6"/>
				</svg>
			{/if}
		</button>

		{#if showDateFilter}
			<button
				class="nav-btn"
				class:active-icon={selectedDays.size > 0 || dateFilterOpen}
				onclick={() => dateFilterOpen = !dateFilterOpen}
				aria-label="Filter by date"
			>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/>
					<path d="M3 8h14" stroke="currentColor" stroke-width="1.6"/>
					<path d="M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
				</svg>
			</button>
		{/if}

		<!-- Search pill (placeholder — not functional in v0.1) -->
		<button class="search-pill" aria-label="Search" disabled>
			<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
				<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
				<path d="M14 14l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			<span>Search</span>
		</button>

		<a href="/prompts/new" class="nav-btn" aria-label="Start a conversation">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
		</a>
	{/if}
</nav>

<!-- Date filter panel (discover variant only) -->
{#if variant === 'discover' && showDateFilter && dateFilterOpen}
	<div class="date-panel" class:date-panel-top={position === 'top'} class:date-panel-bottom={position === 'bottom'}>
		{#each weekDates as day}
			<button
				class="day-cell"
				class:selected={selectedDays.has(day.date)}
				onclick={() => onToggleDay?.(day.date)}
			>
				<span class="day-name">{day.dayShort}</span>
				<span class="day-num">{day.dayNum}</span>
			</button>
		{/each}
	</div>
	{#if selectedDays.size > 0}
		<button class="clear-dates" class:clear-dates-top={position === 'top'} class:clear-dates-bottom={position === 'bottom'} onclick={() => { for (const d of [...selectedDays]) onToggleDay?.(d); }}>
			Clear
		</button>
	{/if}
{/if}

<style>
	.floating-nav {
		display: flex;
		align-items: center;
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 40px);
		max-width: 360px;
		background: rgba(245, 244, 240, 0.96);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 999px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		padding: 8px 12px;
		z-index: 800;
		gap: 8px;
		pointer-events: auto;
	}

	.floating-nav.top { top: 16px; }
	.floating-nav.bottom { bottom: 20px; }

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		color: var(--text-primary, #1a1a1a);
		text-decoration: none;
		flex-shrink: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background 0.15s;
	}

	.nav-btn:hover, .nav-btn.active-icon {
		background: rgba(0, 0, 0, 0.07);
	}

	.nav-spacer { flex: 1; }

	.search-pill {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: rgba(0, 0, 0, 0.05);
		border: none;
		border-radius: 999px;
		color: var(--text-muted, #999);
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.82rem;
		cursor: not-allowed;
		opacity: 0.7;
	}

	/* === Editor variant === */
	.back-text-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.85rem;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		flex-shrink: 0;
	}
	.back-text-btn:hover { color: var(--text-primary); }

	.save-indicator {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.8rem;
		color: var(--text-muted, #999);
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}

	.save-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.save-dot.saved { background: var(--color-success, #3d9e5a); }
	.save-dot.saving { background: var(--color-saving, #f59e0b); }
	.save-dot.error { background: var(--color-danger, #c00); }

	.continue-wrapper {
		position: relative;
	}

	.continue-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.85rem;
		font-weight: 500;
		padding: 8px 20px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition: opacity 0.15s;
		white-space: nowrap;
	}

	.continue-btn:hover { opacity: 0.85; }

	.continue-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: var(--bg-canvas, #f5f3f0);
		border-radius: 12px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		min-width: 200px;
		overflow: hidden;
		z-index: 810;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 14px 18px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		transition: background 0.1s;
	}

	.dropdown-item:last-child { border-bottom: none; }
	.dropdown-item:hover, .dropdown-item:focus { background: rgba(0, 0, 0, 0.04); outline: none; }

	/* === Date filter panel === */
	.date-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 40px);
		max-width: 360px;
		background: rgba(245, 244, 240, 0.98);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 16px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		padding: 10px;
		z-index: 799;
		pointer-events: auto;
		display: flex;
		gap: 4px;
		justify-content: space-between;
	}

	.date-panel-top { top: 76px; }
	.date-panel-bottom { bottom: 88px; }

	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 6px 0;
		flex: 1;
		background: rgba(0, 0, 0, 0.06);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		font-family: inherit;
		color: var(--text-primary, #1a1a1a);
		transition: background 0.15s, color 0.15s;
	}

	.day-cell.selected { background: #1a1a1a; color: #f5f4f0; }

	.day-name { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
	.day-num { font-size: 0.9rem; font-weight: 600; line-height: 1; }

	.clear-dates {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		background: none;
		border: none;
		font-family: inherit;
		font-size: 0.78rem;
		color: var(--text-muted, #999);
		cursor: pointer;
		padding: 4px 8px;
		z-index: 799;
	}

	.clear-dates-top { top: 140px; }
	.clear-dates-bottom { bottom: 148px; }
</style>

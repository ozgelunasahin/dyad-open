<script lang="ts">
	import { onMount } from 'svelte';
	import type { WeekDate } from '$lib/utils/dates';

	let {
		variant = 'discover',
		position = 'bottom',
		active = '',
		attentionCount = 0,
		onMapClick,
		weekDates = [],
		selectedDays = new Set<string>(),
		onToggleDay,
		showDateFilter = false,
		onSearchClick,
		// Editor variant props
		saveStatus = 'idle',
		onBack,
		onSaveDraft,
		onPublish,
	}: {
		variant?: 'discover' | 'editor' | 'default';
		position?: 'top' | 'bottom';
		active?: string;
		attentionCount?: number;
		onMapClick?: () => void;
		weekDates?: WeekDate[];
		selectedDays?: Set<string>;
		onToggleDay?: (date: string) => void;
		showDateFilter?: boolean;
		onSearchClick?: () => void;
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

<nav class="floating-nav" class:top={position === 'top'} class:bottom={position === 'bottom'} aria-label="Navigation">
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
	{:else if variant === 'discover'}
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

		<!-- Search pill -->
		<button class="search-pill" aria-label="Search" onclick={onSearchClick}>
			<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
				<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
				<path d="M14 14l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			<span>Search</span>
		</button>

		<a href="/conversations/new" class="nav-btn" aria-label="Start a conversation">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
		</a>

		<a href="/profile" class="nav-btn" aria-label="Profile">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
				<path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			{#if attentionCount > 0}<span class="badge-dot"><span class="sr-only">{attentionCount} notifications</span></span>{/if}
		</a>
	{:else if variant === 'default'}
		<!-- Default variant: Discover + Profile -->
		<a href="/discover" class="nav-btn" aria-label="Discover">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
				<path d="M14 14l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
		</a>

		<a href="/profile" class="nav-btn" aria-label="Profile">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
				<path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			{#if attentionCount > 0}<span class="badge-dot"><span class="sr-only">{attentionCount} notifications</span></span>{/if}
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
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		color: var(--text-primary);
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

	.badge-dot {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 8px;
		height: 8px;
		background: var(--color-danger, #c00);
		border-radius: 50%;
		border: 2px solid rgba(245, 244, 240, 0.96);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}

	.nav-spacer { flex: 1; }

	.search-pill {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: 9px var(--space-4);
		background: rgba(0, 0, 0, 0.07);
		border: none;
		border-radius: var(--radius-pill);
		color: var(--text-muted);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.15s;
	}

	.search-pill:hover { background: rgba(0, 0, 0, 0.1); }

	/* === Editor variant === */
	.back-text-btn {
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-1) var(--space-2);
		flex-shrink: 0;
	}
	.back-text-btn:hover { color: var(--text-primary); }

	.save-indicator {
		font-size: var(--text-sm);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		white-space: nowrap;
	}

	.save-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.save-dot.saved { background: var(--color-success); }
	.save-dot.saving { background: var(--color-saving); }
	.save-dot.error { background: var(--color-danger, #c00); }

	.continue-wrapper {
		position: relative;
	}

	.continue-btn {
		font-size: var(--text-sm);
		font-weight: 500;
		padding: var(--space-2) var(--space-5);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s;
		white-space: nowrap;
	}

	.continue-btn:hover { opacity: 0.85; }

	.continue-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		min-width: 200px;
		overflow: hidden;
		z-index: 810;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-3) var(--space-5);
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link);
		font-size: var(--text-md);
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
		color: var(--text-primary);
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
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px 8px;
		z-index: 799;
	}

	.clear-dates-top { top: 140px; }
	.clear-dates-bottom { bottom: 148px; }
</style>

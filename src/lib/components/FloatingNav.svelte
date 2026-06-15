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
		// Editor controls (used in default variant)
		saveStatus,
		onSaveDraft,
		onPublish,
		onDiscard,
		// Profile variant controls
		onCalendarClick,
		calendarActive = false,
	}: {
		variant?: 'discover' | 'default' | 'profile' | 'landing';
		position?: 'top' | 'bottom';
		active?: string;
		attentionCount?: number;
		onMapClick?: () => void;
		weekDates?: WeekDate[];
		selectedDays?: Set<string>;
		onToggleDay?: (date: string) => void;
		showDateFilter?: boolean;
		onSearchClick?: () => void;
		// Editor controls
		saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
		onSaveDraft?: () => void;
		onPublish?: () => void;
		onDiscard?: () => void;
		// Profile variant controls
		onCalendarClick?: () => void;
		calendarActive?: boolean;
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

<div class="floating-nav-anchor" class:top={position === 'top'} class:bottom={position === 'bottom'} class:wide={variant === 'discover'}>
	<nav class="floating-nav" class:default-variant={variant === 'default'} aria-label="Navigation">
	{#if variant === 'discover'}
		<!-- Map / list toggle -->
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

		<!-- Plus — center, prominent -->
		<a href="/conversations/new" class="plus-btn" aria-label="Start a conversation">
			<svg width="22" height="22" viewBox="0 0 20 20" fill="none">
				<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
		</a>

		<!-- Calendar filter -->
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
	{:else if variant === 'default'}
		<!-- Default variant: Discover [editor controls?] Profile -->
		<a href="/discover" class="nav-btn" aria-label="Discover map">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M1 4l5 2 6-2 6 2v12l-6-2-6 2-5-2V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
				<path d="M6 6v12M12 4v12" stroke="currentColor" stroke-width="1.6"/>
			</svg>
		</a>

		{#if saveStatus !== undefined}
			<!-- Editor controls: save indicator + continue -->
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
						{#if onPublish}
							<button
								class="dropdown-item"
								role="menuitem"
								tabindex="-1"
								onkeydown={handleMenuItemKeydown}
								onclick={() => { continueDropdownOpen = false; onPublish?.(); }}
							>
								Publish as Conversation
							</button>
						{/if}
						{#if onDiscard}
							<button
								class="dropdown-item dropdown-item--danger"
								role="menuitem"
								tabindex="-1"
								onkeydown={handleMenuItemKeydown}
								onclick={() => { continueDropdownOpen = false; onDiscard?.(); }}
							>
								Discard
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<span class="nav-spacer"></span>
		{/if}

		<a href="/profile" class="nav-btn" aria-label="Profile">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
				<path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			{#if attentionCount > 0}<span class="badge-dot"><span class="sr-only">{attentionCount} notifications</span></span>{/if}
		</a>
	{:else if variant === 'profile'}
		<!-- Profile variant: Map | + | Profile -->
		<a href="/discover" class="nav-btn" aria-label="Discover map">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M1 4l5 2 6-2 6 2v12l-6-2-6 2-5-2V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
				<path d="M6 6v12M12 4v12" stroke="currentColor" stroke-width="1.6"/>
			</svg>
		</a>

		<a href="/conversations/new" class="nav-btn" aria-label="Start a conversation">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
		</a>

		<a href="/profile" class="nav-btn active-icon" aria-label="Profile" aria-current="page">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
				<path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			{#if attentionCount > 0}<span class="badge-dot"><span class="sr-only">{attentionCount} notifications</span></span>{/if}
		</a>
	{:else if variant === 'landing'}
		<!-- Landing variant: just the map/list toggle -->
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
	{/if}
	</nav>
</div>

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
	/* Wrapper — positions both the nav and back tab */
	.floating-nav-anchor {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		width: auto;
		max-width: calc(100% - 40px);
		z-index: 800;
		pointer-events: none;
	}
	.floating-nav-anchor.top { top: var(--space-4); }
	.floating-nav-anchor.bottom { bottom: var(--space-5); }
	.floating-nav-anchor.wide { width: auto; }

	/* Nav pill */
	.floating-nav {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		background: var(--bg-glass);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--radius-pill);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		padding: var(--space-2) var(--space-3);
		gap: var(--space-2);
		pointer-events: auto;
	}

	/* FloatingNav visible on all viewports — no sidebar */

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
		background: var(--color-danger);
		border-radius: 50%;
		border: 2px solid var(--bg-glass);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}

	.nav-spacer { flex: 1; }

	.plus-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--text-primary);
		color: var(--bg-canvas);
		text-decoration: none;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}

	.plus-btn:hover { opacity: var(--opacity-hover-btn); }

	/* === Editor controls (embedded in default variant) === */

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
	.save-dot.error { background: var(--color-danger); }

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

	.continue-btn:hover { opacity: var(--opacity-hover-btn); }

	.continue-dropdown {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		right: 0;
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		min-width: 260px;
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
		white-space: nowrap;
		transition: background 0.1s;
	}

	.dropdown-item:last-child { border-bottom: none; }
	.dropdown-item:hover, .dropdown-item:focus { background: rgba(0, 0, 0, 0.04); outline: none; }
	.dropdown-item--danger { color: var(--color-danger); }
	.dropdown-item--danger:hover { background: rgba(220, 38, 38, 0.06); }

	/* === Date filter panel === */
	.date-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 40px);
		max-width: 360px;
		background: var(--bg-glass);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--radius-card);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		padding: var(--space-3);
		z-index: 799;
		pointer-events: auto;
		display: flex;
		gap: var(--space-1);
		justify-content: space-between;
	}

	.date-panel-top { top: 76px; }
	.date-panel-bottom { bottom: 88px; }

	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: var(--space-1) 0;
		flex: 1;
		background: rgba(0, 0, 0, 0.06);
		border: none;
		border-radius: var(--radius-card);
		cursor: pointer;
		font-family: inherit;
		color: var(--text-primary);
		transition: background 0.15s, color 0.15s;
	}

	.day-cell.selected { background: var(--text-primary); color: var(--bg-canvas); }

	.day-name { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
	.day-num { font-size: var(--text-base); font-weight: 600; line-height: 1; }

	.clear-dates {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		background: none;
		border: none;
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1) var(--space-2);
		z-index: 799;
	}

	.clear-dates-top { top: 140px; }
	.clear-dates-bottom { bottom: 148px; }

</style>

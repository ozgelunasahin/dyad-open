<script lang="ts">
	import { onMount } from 'svelte';
	import { copy } from '$lib/copy';
	import type { WeekDate } from '$lib/utils/dates';

	export interface FloatingNavAction {
		label: string;
		href?: string;
		onclick?: () => void;
		danger?: boolean;
	}

	/**
	 * FloatingNav is composed of a shared CORE TRIPLET (always rendered on
	 * authenticated variants):
	 *
	 *   [discover-or-map-toggle]  [+]  [profile]
	 *
	 * Variants add optional extras on either side of the triplet. Prefer
	 * symmetry (+1 each side) where it reads well, but don't force it.
	 *
	 *   discover  : [date-filter?] → core → [search]
	 *                (core's discover slot renders as map/list toggle)
	 *   detail    : [back] → core → [kebab?]
	 *                (used on conversation/meeting detail pages)
	 *   profile   : just the core triplet, with profile marked active
	 *   default   : just the core triplet (user detail pages, etc.)
	 *   landing   : special — map/list toggle alone, no auth-gated actions
	 */
	let {
		variant = 'default',
		position = 'bottom',
		active = '',
		attentionCount = 0,
		onMapClick,
		weekDates = [],
		selectedDays = new Set<string>(),
		onToggleDay,
		showDateFilter = false,
		onSearchClick,
		// Detail variant controls (conversations/[id], meetings/[id])
		onBackClick,
		actions = [],
	}: {
		variant?: 'discover' | 'default' | 'profile' | 'landing' | 'detail';
		position?: 'top' | 'bottom';
		active?: string;
		attentionCount?: number;
		onMapClick?: () => void;
		weekDates?: WeekDate[];
		selectedDays?: Set<string>;
		onToggleDay?: (date: string) => void;
		showDateFilter?: boolean;
		onSearchClick?: () => void;
		onBackClick?: () => void;
		actions?: FloatingNavAction[];
	} = $props();

	let dateFilterOpen = $state(false);
	let actionsDropdownOpen = $state(false);
	let actionsDropdownRef: HTMLElement | undefined = $state();

	// Close dropdown on click outside
	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (actionsDropdownOpen && actionsDropdownRef && !actionsDropdownRef.contains(e.target as Node)) {
				actionsDropdownOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside, true);
		return () => document.removeEventListener('click', handleClickOutside, true);
	});

	function defaultBackHandler() {
		if (typeof window === 'undefined') return;
		if (window.history.length > 1) window.history.back();
		else window.location.href = '/discover';
	}
</script>

<!-- ── Core triplet: rendered the same way across every authenticated variant ── -->
{#snippet coreDiscover(asToggle: boolean, mapActive: boolean)}
	{#if asToggle}
		<!-- On the discover variant the button is a map/list toggle. It's the
		     current page, so the icon stays accented in both states — the
		     icon swap (map ↔ list) carries the mode, the tint carries "you
		     are here". -->
		<button
			class="nav-btn active-icon"
			onclick={onMapClick}
			aria-label={mapActive ? 'List view' : 'Map view'}
		>
			{#if mapActive}
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
	{:else}
		<a href="/discover" class="nav-btn" aria-label="Discover">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path d="M1 4l5 2 6-2 6 2v12l-6-2-6 2-5-2V4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
				<path d="M6 6v12M12 4v12" stroke="currentColor" stroke-width="1.6"/>
			</svg>
		</a>
	{/if}
{/snippet}

{#snippet corePlus()}
	<a href="/conversations/new" class="plus-btn" aria-label="Start a conversation">
		<svg width="22" height="22" viewBox="0 0 20 20" fill="none">
			<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
		</svg>
	</a>
{/snippet}

{#snippet coreProfile(profileActive: boolean)}
	<a
		href="/profile"
		class="nav-btn"
		class:active-icon={profileActive}
		aria-label="Profile"
		aria-current={profileActive ? 'page' : undefined}
	>
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
			<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
			<path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
		</svg>
		{#if attentionCount > 0}<span class="badge-dot"><span class="sr-only">{attentionCount} notifications</span></span>{/if}
	</a>
{/snippet}

<div class="floating-nav-anchor" class:top={position === 'top'} class:bottom={position === 'bottom'} class:wide={variant === 'discover'}>
	<nav class="floating-nav" aria-label="Navigation">

		{#if variant === 'landing'}
			<!-- Landing (anonymous): map/list toggle alone; no auth-gated buttons. -->
			{@render coreDiscover(true, active === 'map')}

		{:else}
			<!-- LEFT EXTRAS -->
			{#if variant === 'detail'}
				<button class="nav-btn" onclick={onBackClick ?? defaultBackHandler} aria-label="Back">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}

			{#if variant === 'discover' && showDateFilter}
				<button
					class="nav-btn"
					class:active-icon={selectedDays.size > 0 || dateFilterOpen}
					onclick={() => (dateFilterOpen = !dateFilterOpen)}
					aria-label="Filter by date"
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/>
						<path d="M3 8h14" stroke="currentColor" stroke-width="1.6"/>
						<path d="M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
					</svg>
				</button>
			{/if}

			<!-- CORE TRIPLET -->
			{@render coreDiscover(variant === 'discover', active === 'map')}
			{@render corePlus()}
			{@render coreProfile(variant === 'profile')}

			<!-- RIGHT EXTRAS -->
			{#if variant === 'discover'}
				<button class="nav-btn" aria-label="Search" onclick={onSearchClick}>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
						<path d="M14 14l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
					</svg>
				</button>
			{/if}

			{#if variant === 'detail'}
				{#if actions.length > 0}
					<div class="actions-wrapper" bind:this={actionsDropdownRef}>
						<button
							class="nav-btn"
							onclick={() => (actionsDropdownOpen = !actionsDropdownOpen)}
							aria-label="Actions"
							aria-haspopup="true"
							aria-expanded={actionsDropdownOpen}
						>
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<circle cx="5" cy="10" r="1.5" fill="currentColor"/>
								<circle cx="10" cy="10" r="1.5" fill="currentColor"/>
								<circle cx="15" cy="10" r="1.5" fill="currentColor"/>
							</svg>
						</button>
						{#if actionsDropdownOpen}
							<div class="actions-dropdown" role="menu">
								{#each actions as action}
									{#if action.href}
										<a
											href={action.href}
											class="dropdown-item"
											class:dropdown-item--danger={action.danger}
											role="menuitem"
											onclick={() => { actionsDropdownOpen = false; action.onclick?.(); }}
										>
											{action.label}
										</a>
									{:else}
										<button
											class="dropdown-item"
											class:dropdown-item--danger={action.danger}
											role="menuitem"
											onclick={() => { actionsDropdownOpen = false; action.onclick?.(); }}
										>
											{action.label}
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<!-- Invisible placeholder to keep the + centred when no kebab. -->
					<span class="nav-btn-placeholder" aria-hidden="true"></span>
				{/if}
			{/if}
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
			{copy.common.clear}
		</button>
	{/if}
{/if}

<style>
	/* Wrapper */
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

	/* Placeholder matching a nav-btn's footprint — keeps the + centred when a
	 * variant's right-side slot is conditional (e.g. detail without kebab). */
	.nav-btn-placeholder {
		display: block;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
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

	/* Detail-variant kebab dropdown */
	.actions-wrapper { position: relative; }
	.actions-dropdown {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		right: 0;
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		min-width: 180px;
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
		font-family: inherit;
		color: var(--text-primary);
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s;
	}
	.dropdown-item:last-child { border-bottom: none; }
	.dropdown-item:hover, .dropdown-item:focus { background: rgba(0, 0, 0, 0.04); outline: none; }
	.dropdown-item--danger { color: var(--color-danger); }
	.dropdown-item--danger:hover { background: color-mix(in srgb, var(--color-danger) 6%, transparent); }

	/* Date filter panel */
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

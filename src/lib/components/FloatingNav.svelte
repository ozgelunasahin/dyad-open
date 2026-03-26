<script lang="ts">
	let {
		position = 'bottom',
		active = '',
		onMapClick,
		weekDates = [],
		selectedDays = new Set<string>(),
		onToggleDay,
		showDateFilter = false,
	}: {
		position?: 'top' | 'bottom';
		active?: string;
		onMapClick?: () => void;
		weekDates?: { date: string; dayShort: string; dayNum: number }[];
		selectedDays?: Set<string>;
		onToggleDay?: (date: string) => void;
		showDateFilter?: boolean;
	} = $props();

	let dateFilterOpen = $state(false);
</script>

<nav class="floating-nav" class:top={position === 'top'} class:bottom={position === 'bottom'}>
	<!-- Map/List toggle -->
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

	<!-- Date filter -->
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

	<!-- Spacer -->
	<span class="nav-spacer"></span>

	<!-- Create conversation -->
	<a href="/prompts/new" class="nav-btn" aria-label="Start a conversation">
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
			<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
		</svg>
	</a>

	<!-- Profile -->
	<a href="/profile" class="nav-btn" class:active-icon={active === 'profile'} aria-label="Profile">
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
			<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.6"/>
			<path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
		</svg>
	</a>
</nav>

<!-- Date filter panel -->
{#if showDateFilter && dateFilterOpen}
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
	/* Hidden on desktop — sidebar handles navigation there */
	@media (min-width: 769px) {
		.floating-nav, .date-panel, .clear-dates { display: none !important; }
	}

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

import type { Card, Connection, Camera, Point, Vault, Dimensions, LinkSide, SourceBounds } from '$lib/types';
import type { JSONContent } from '@tiptap/core';
import { MAX_CARDS, MIN_CARD_WIDTH, MAX_CARD_WIDTH } from '$lib/types';
import { calculateNewCardPosition } from '$lib/utils/layout';
import { calculateOptimalWidthFromJson, estimateContentHeight } from '$lib/utils/json-content';

// Stored path with metadata
export interface StoredPath {
	points: Point[];
	svgPath: string;
	method: string;
	failed: boolean;
}

const STORAGE_KEY_PREFIX = 'spatial-reader-state';

interface PersistedState {
	lastViewedNoteId: string | null;
	cameraState: Camera;
	// Full canvas state for restoration
	cards?: Array<{
		id: string;
		noteId: string;
		position: Point;
		dimensions: Dimensions;
		parentId: string | null;
		sourceLink: Point | null;
	}>;
	connections?: Connection[];
	activeChain?: string[];
}

function getStorageKey(canvasId: string | null): string {
	return canvasId ? `${STORAGE_KEY_PREFIX}-${canvasId}` : STORAGE_KEY_PREFIX;
}

function loadPersistedState(canvasId: string | null): PersistedState | null {
	if (typeof window === 'undefined') return null;
	try {
		const stored = localStorage.getItem(getStorageKey(canvasId));
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Ignore parse errors
	}
	return null;
}

function savePersistedState(canvasId: string | null, state: PersistedState): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(getStorageKey(canvasId), JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

// Database-saved position format
export interface SavedPosition {
	id: string;
	noteId: string;
	x: number;
	y: number;
	width: number;
	height: number;
	parentCardId: string | null;
	sourceLinkX: number | null;
	sourceLinkY: number | null;
}

class CanvasStore {
	cards = $state<Map<string, Card>>(new Map());
	connections = $state<Connection[]>([]);
	activeChain = $state<string[]>([]);
	camera = $state<Camera>({ x: 0, y: 0, zoom: 1 });

	// Stored paths - computed once when connection is created, never recalculated
	// Key format: "fromCardId-toCardId"
	storedPaths = $state<Map<string, StoredPath>>(new Map());

	// Focus state for smooth centering
	focusedCardId = $state<string | null>(null);
	isAnimating = $state<boolean>(false);

	// Connection line visibility
	showLines = $state<boolean>(true);

	// Debug mode
	debugMode = $state<boolean>(false);

	// Edit mode state
	editingCardId = $state<string | null>(null);

	// Dimension cache - pre-computed at vault load for O(1) lookup
	private dimensionCache = $state<Map<string, Dimensions>>(new Map());

	// Link focus state for keyboard navigation
	focusedLinkIndex = $state<number | null>(null);
	isLinkFocusMode = $derived(this.focusedLinkIndex !== null);

	// Per-card reading state (vertical scroll position, link focus, etc.)
	// Saved when leaving a card, restored when returning
	// Only vertical position is saved - horizontal is restored to card center
	private savedCardState = $state<Map<string, {
		focusY: number;  // Canvas-space Y that was at viewport center (reading position)
		linkTarget?: string;
		linkFocusActive?: boolean;
	}>>(new Map());

	// Viewport dimensions for reading zone calculations
	private viewportWidth = $state<number>(0);
	private viewportHeight = $state<number>(0);

	// Current canvas ID for per-canvas state persistence
	private currentCanvasId: string | null = null;

	private history = $state<{ back: string[][]; forward: string[][] }>({
		back: [],
		forward: []
	});

	private vault: Vault | null = null;
	private brokenLinks = $state<Set<string>>(new Set());

	cardList = $derived(Array.from(this.cards.values()));
	canGoBack = $derived(this.history.back.length > 0);
	canGoForward = $derived(this.history.forward.length > 0);
	cardCount = $derived(this.cards.size);
	isAtLimit = $derived(this.cards.size >= MAX_CARDS);

	async initialize(vault: Vault, canvasId?: string, savedPositions?: SavedPosition[]): Promise<void> {
		console.log('[Store] initialize called');
		this.vault = vault;
		this.currentCanvasId = canvasId ?? null;

		// Clear previous state when switching canvases
		this.cards = new Map();
		this.connections = [];
		this.activeChain = [];
		this.storedPaths = new Map();
		this.focusedCardId = null;
		this.editingCardId = null;
		this.history = { back: [], forward: [] };

		// Pre-compute broken links
		const validNoteIds = new Set(Object.keys(vault.notes));
		const broken = new Set<string>();
		for (const note of Object.values(vault.notes)) {
			for (const link of note.wikilinks) {
				if (!validNoteIds.has(link)) {
					broken.add(link);
				}
			}
		}
		this.brokenLinks = broken;

		// Pre-compute dimensions for all notes (O(1) lookup during navigation)
		const newDimensionCache = new Map<string, Dimensions>();
		for (const [noteId, note] of Object.entries(vault.notes)) {
			const width = calculateOptimalWidthFromJson(note.content, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
			const height = estimateContentHeight(note.content, width);
			newDimensionCache.set(noteId, { width, height: Math.max(100, height) });
		}
		this.dimensionCache = newDimensionCache;

		// Load camera state from localStorage (camera is local preference)
		const persisted = loadPersistedState(this.currentCanvasId);
		if (persisted?.cameraState) {
			this.camera = persisted.cameraState;
		}

		// Try to restore from database positions first
		if (savedPositions && savedPositions.length > 0) {
			const restoredCards = new Map<string, Card>();

			// Helper to extract noteId from parent reference (strip canvasId prefix)
			const extractNoteId = (parentCardId: string | null): string | null => {
				if (!parentCardId) return null;
				// parentCardId format is "canvasId-noteId", extract noteId
				const dashIndex = parentCardId.indexOf('-');
				return dashIndex !== -1 ? parentCardId.substring(dashIndex + 1) : parentCardId;
			};

			for (const pos of savedPositions) {
				const note = vault.notes[pos.noteId];
				if (note) {
					// Use noteId as the card id (consistent with rest of codebase)
					restoredCards.set(pos.noteId, {
						id: pos.noteId,
						note,
						position: { x: pos.x, y: pos.y },
						dimensions: { width: pos.width, height: pos.height },
						parentId: extractNoteId(pos.parentCardId),
						sourceLink: pos.sourceLinkX !== null && pos.sourceLinkY !== null
							? { x: pos.sourceLinkX, y: pos.sourceLinkY }
							: null
					});
				}
			}

			if (restoredCards.size > 0) {
				this.cards = restoredCards;
				// Rebuild connections from parent relationships
				for (const card of restoredCards.values()) {
					if (card.parentId && restoredCards.has(card.parentId)) {
						// Convert legacy sourceLink Point to SourceBounds
						const legacyPoint = card.sourceLink || { x: card.position.x, y: card.position.y };
						this.connections.push({
							fromCardId: card.parentId,
							toCardId: card.id,
							sourceBounds: { left: legacyPoint.x, right: legacyPoint.x, y: legacyPoint.y }
						});
					}
				}
				// Build active chain (cards without children at end)
				this.activeChain = Array.from(restoredCards.keys());

				// Focus on last card
				const lastCard = this.activeChain[this.activeChain.length - 1];
				if (lastCard) {
					this.focusCard(lastCard);
				}
				return;
			}
		}

		// Fallback to localStorage if no DB positions
		if (persisted?.cards && persisted.cards.length > 0) {
			const restoredCards = new Map<string, Card>();

			for (const savedCard of persisted.cards) {
				const note = vault.notes[savedCard.noteId];
				if (note) {
					restoredCards.set(savedCard.id, {
						id: savedCard.id,
						note,
						position: savedCard.position,
						dimensions: savedCard.dimensions,
						parentId: savedCard.parentId,
						sourceLink: savedCard.sourceLink
					});
				}
			}

			if (restoredCards.size > 0) {
				this.cards = restoredCards;
				this.connections = persisted.connections || [];
				this.activeChain = persisted.activeChain || [];

				// Focus on the current card
				const currentCardId = this.activeChain[this.activeChain.length - 1];
				if (currentCardId && this.cards.has(currentCardId)) {
					this.focusCard(currentCardId);
				}

				// Migrate to DB
				this.persistToDatabase();
				return;
			}
		}

		// Fallback: Open the entry note
		console.log('[Store] Opening entry note');
		const entryNoteId = persisted?.lastViewedNoteId || vault.entryPoint;
		const entryNote = vault.notes[entryNoteId] || vault.notes[vault.entryPoint];
		if (entryNote) {
			console.log('[Store] Entry note:', entryNote.id);
			this.openNote(entryNote.id, null, null);
		}
		console.log('[Store] initialize complete');
	}

	// Debounced save to database
	private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	private schedulePersist(): void {
		if (this.persistDebounceTimer) {
			clearTimeout(this.persistDebounceTimer);
		}
		this.persistDebounceTimer = setTimeout(() => {
			this.persistToDatabase();
		}, 1000);
	}

	private async persistToDatabase(): Promise<void> {
		if (!this.currentCanvasId) return;

		// Use canvasId-noteId as unique ID to avoid conflicts across canvases
		const canvasId = this.currentCanvasId;
		const positions = Array.from(this.cards.values()).map((card) => ({
			id: `${canvasId}-${card.id}`,
			noteId: card.note.id,
			x: card.position.x,
			y: card.position.y,
			width: card.dimensions.width,
			height: card.dimensions.height,
			parentCardId: card.parentId ? `${canvasId}-${card.parentId}` : null,
			sourceLinkX: card.sourceLink?.x ?? null,
			sourceLinkY: card.sourceLink?.y ?? null
		}));

		try {
			await fetch(`/api/canvases/${this.currentCanvasId}/positions`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ positions })
			});
		} catch (err) {
			console.error('Failed to persist canvas state:', err);
		}

		// Also save camera to localStorage (local preference)
		this.persistState();
	}

	isLinkBroken(target: string): boolean {
		// Check if note exists in vault (handles dynamically created wikilinks)
		if (this.vault && !this.vault.notes[target]) {
			return true;
		}
		return this.brokenLinks.has(target);
	}

	/**
	 * Calculate dimensions for a note's content.
	 * Uses cache if available, otherwise calculates and caches.
	 */
	private calculateCardDimensions(content: JSONContent, noteId?: string): Dimensions {
		// Use cache if available
		if (noteId && this.dimensionCache.has(noteId)) {
			return this.dimensionCache.get(noteId)!;
		}

		// Fallback to calculation (for dynamically created notes)
		const width = calculateOptimalWidthFromJson(content, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
		const height = estimateContentHeight(content, width);
		const dimensions = { width, height: Math.max(100, height) };

		// Cache the result
		if (noteId) {
			const newCache = new Map(this.dimensionCache);
			newCache.set(noteId, dimensions);
			this.dimensionCache = newCache;
		}

		return dimensions;
	}

	openNote(noteId: string, fromCardId: string | null, sourceBounds: SourceBounds | null): boolean {
		console.log('[Store] openNote:', noteId);
		if (!this.vault) return false;

		const note = this.vault.notes[noteId];
		if (!note) return false;
		console.log('[Store] Note content type:', typeof note.content);

		// Check if note is already open
		if (this.cards.has(noteId)) {
			// Update active chain and focus
			this.history.back.push([...this.activeChain]);
			this.history.forward = [];
			this.activeChain = [...this.activeChain, noteId];
			this.focusCard(noteId);
			this.persistState();
			return true;
		}

		// Check card limit
		if (this.cards.size >= MAX_CARDS) {
			return false;
		}

		// Calculate dimensions for new card (uses cache)
		const dimensions = this.calculateCardDimensions(note.content, noteId);

		// Get parent card if exists
		const parentCard = fromCardId ? this.cards.get(fromCardId) ?? null : null;
		const existingCards = Array.from(this.cards.values());

		// Use center of link bounds for placement calculations
		const linkCenter: Point | null = sourceBounds
			? { x: (sourceBounds.left + sourceBounds.right) / 2, y: sourceBounds.y }
			: null;

		// Calculate position using priority-based algorithm with crossing prevention
		// Pass existing path points (not connections) for collision detection
		const existingPathPoints = this.getExistingPathPoints();
		const { position, routingX } = calculateNewCardPosition(
			parentCard,
			existingCards,
			linkCenter,
			dimensions,
			existingPathPoints
		);

		// Create new card
		const newCard: Card = {
			id: noteId,
			note,
			position,
			dimensions,
			parentId: fromCardId,
			sourceLink: linkCenter
		};

		// Update state
		const newCards = new Map(this.cards);
		newCards.set(noteId, newCard);
		this.cards = newCards;

		// Add connection if has parent
		if (fromCardId && sourceBounds) {
			this.connections = [
				...this.connections,
				{
					fromCardId,
					toCardId: noteId,
					sourceBounds,
					routingX // Include pre-assigned routing channel
				}
			];
		}

		// Update navigation
		this.history.back.push([...this.activeChain]);
		this.history.forward = [];
		this.activeChain = [...this.activeChain, noteId];

		// Focus on new card
		this.focusCard(noteId);

		this.persistState();
		this.schedulePersist();
		return true;
	}

	/**
	 * Add a new note to the vault (for dynamically created notes).
	 * This makes the note available for opening without a page reload.
	 */
	addNoteToVault(noteId: string, title: string, content?: JSONContent): void {
		if (!this.vault) return;

		// Create note with provided content or default empty structure
		const note = {
			id: noteId,
			title,
			content: content ?? {
				type: 'doc',
				content: [
					{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
					{ type: 'paragraph' }
				]
			},
			wikilinks: [] as string[]
		};

		// Add to vault
		this.vault.notes[noteId] = note;

		// Remove from broken links
		const newBrokenLinks = new Set(this.brokenLinks);
		newBrokenLinks.delete(noteId);
		this.brokenLinks = newBrokenLinks;
	}

	/**
	 * Update the content of a note after editing.
	 * Updates both the vault and any open card, and invalidates dimension cache.
	 */
	updateNoteContent(noteId: string, content: JSONContent): void {
		// Update in vault
		if (this.vault?.notes[noteId]) {
			this.vault.notes[noteId].content = content;
		}

		// Invalidate dimension cache for this note (will recalculate on next open)
		if (this.dimensionCache.has(noteId)) {
			const newCache = new Map(this.dimensionCache);
			newCache.delete(noteId);
			this.dimensionCache = newCache;
		}

		// Update in open card - reassign the map to trigger Svelte reactivity
		const card = this.cards.get(noteId);
		if (card) {
			const updatedCard = {
				...card,
				note: { ...card.note, content }
			};
			const newCards = new Map(this.cards);
			newCards.set(noteId, updatedCard);
			this.cards = newCards;
		}
	}

	/**
	 * Open a note from the introduction panel (no parent connection).
	 * Used when clicking wikilinks in the WebsiteContainer intro text.
	 */
	openNoteFromIntro(noteId: string): boolean {
		return this.openNote(noteId, null, null);
	}

	/**
	 * Focus on a card and position for reading (top of card near top of viewport).
	 * Saves reading state for current card, restores for target card if previously visited.
	 * Link focus restoration is included in the event for the Canvas to handle after animation.
	 */
	focusCard(cardId: string): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		// Save current card's state before switching (camera is saved here, link state saved separately)
		// BUT: If card has been panned out of the reading zone, don't save - clear it instead
		if (this.focusedCardId && this.focusedCardId !== cardId) {
			const inReadingZone = this.viewportWidth > 0 && this.viewportHeight > 0
				? this.isCardInReadingZone(this.viewportWidth, this.viewportHeight, 100)
				: true; // If no viewport info, assume in zone

			if (!inReadingZone) {
				// Card panned out of view - clear saved state so it will re-focus for reading
				this.clearSavedCardState(this.focusedCardId);
			} else {
				// Card still in reading zone - save only vertical focus position
				// Horizontal position is discarded; will restore to card center
				const focusY = this.viewportHeight > 0
					? (this.viewportHeight / 2 - this.camera.y) / this.camera.zoom
					: 0;
				const existing = this.savedCardState.get(this.focusedCardId);
				const newMap = new Map(this.savedCardState);
				newMap.set(this.focusedCardId, {
					...existing,
					focusY
				});
				this.savedCardState = newMap;
			}
		}

		// Check if we have saved state for the target card
		const savedState = this.savedCardState.get(cardId);

		this.focusedCardId = cardId;

		// Dispatch event for Canvas to animate
		// Include link restoration info so Canvas can restore AFTER animation completes
		if (typeof window !== 'undefined') {
			this.isAnimating = true;

			const linkRestoration = savedState?.linkFocusActive
				? { linkTarget: savedState.linkTarget, linkFocusActive: true }
				: null;

			if (savedState?.focusY !== undefined) {
				// Returning to previously visited card - restore vertical position
				// Horizontal position restored to card center
				window.dispatchEvent(
					new CustomEvent('canvas-restore', {
						detail: {
							focusY: savedState.focusY,
							cardId: card.id,  // Canvas uses this to compute centered X
							linkRestoration
						}
					})
				);
			} else {
				// New card - animate to reading position
				window.dispatchEvent(
					new CustomEvent('canvas-focus', {
						detail: {
							x: card.position.x + card.dimensions.width / 2,
							y: card.position.y, // Card top, not center
							cardId: card.id,
							linkRestoration
						}
					})
				);
			}
		}
	}

	/**
	 * Focus a card without animating to it (for first-click behavior).
	 * Just sets the focused card and saves current card's state.
	 * A second click will trigger pan to reading position.
	 */
	focusCardWithoutAnimation(cardId: string): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		// Save current card's state before switching
		if (this.focusedCardId && this.focusedCardId !== cardId) {
			const inReadingZone = this.viewportWidth > 0 && this.viewportHeight > 0
				? this.isCardInReadingZone(this.viewportWidth, this.viewportHeight, 100)
				: true;

			if (!inReadingZone) {
				this.clearSavedCardState(this.focusedCardId);
			} else {
				const focusY = this.viewportHeight > 0
					? (this.viewportHeight / 2 - this.camera.y) / this.camera.zoom
					: 0;
				const existing = this.savedCardState.get(this.focusedCardId);
				const newMap = new Map(this.savedCardState);
				newMap.set(this.focusedCardId, {
					...existing,
					focusY
				});
				this.savedCardState = newMap;
			}
		}

		// Just set focus, no animation
		this.focusedCardId = cardId;
	}

	/**
	 * Pan to reading position for the currently focused card.
	 * Used on second click when card is already focused.
	 */
	panToFocusedCard(): void {
		const card = this.focusedCardId ? this.cards.get(this.focusedCardId) : null;
		if (!card) return;

		const savedState = this.savedCardState.get(this.focusedCardId!);

		if (typeof window !== 'undefined') {
			this.isAnimating = true;

			if (savedState?.focusY !== undefined) {
				// Restore to saved vertical position, centered horizontally
				window.dispatchEvent(
					new CustomEvent('canvas-restore', {
						detail: {
							focusY: savedState.focusY,
							cardId: card.id,
							linkRestoration: null
						}
					})
				);
			} else {
				// New card - animate to reading position
				window.dispatchEvent(
					new CustomEvent('canvas-focus', {
						detail: {
							x: card.position.x + card.dimensions.width / 2,
							y: card.position.y,
							cardId: card.id,
							linkRestoration: null
						}
					})
				);
			}
		}
	}

	goBack(): void {
		if (this.history.back.length === 0) return;

		const newForward = [...this.history.forward, [...this.activeChain]];
		const previousChain = this.history.back.pop()!;

		this.history = {
			back: [...this.history.back],
			forward: newForward
		};
		this.activeChain = previousChain;

		// Focus on last card in chain
		const lastCard = previousChain[previousChain.length - 1];
		if (lastCard) {
			this.focusCard(lastCard);
		}

		this.persistState();
	}

	goForward(): void {
		if (this.history.forward.length === 0) return;

		const newBack = [...this.history.back, [...this.activeChain]];
		const nextChain = this.history.forward.pop()!;

		this.history = {
			back: newBack,
			forward: [...this.history.forward]
		};
		this.activeChain = nextChain;

		// Focus on last card in chain
		const lastCard = nextChain[nextChain.length - 1];
		if (lastCard) {
			this.focusCard(lastCard);
		}

		this.persistState();
	}

	updateCamera(camera: Camera): void {
		this.camera = camera;
		this.persistState();
	}

	updateViewportDimensions(width: number, height: number): void {
		this.viewportWidth = width;
		this.viewportHeight = height;
	}

	setAnimating(animating: boolean): void {
		this.isAnimating = animating;
	}

	enterEditMode(cardId: string): void {
		this.editingCardId = cardId;
	}

	exitEditMode(): void {
		this.editingCardId = null;
	}

	// Link focus methods for keyboard navigation
	enterLinkFocusMode(): void {
		this.focusedLinkIndex = 0;
	}

	exitLinkFocusMode(): void {
		this.focusedLinkIndex = null;
	}

	// Save link focus state (target and mode) for current card before leaving
	saveLinkState(linkTarget: string | undefined, linkFocusActive: boolean): void {
		if (!this.focusedCardId) return;
		// Compute current focus Y if we don't have one
		const existing = this.savedCardState.get(this.focusedCardId);
		const focusY = existing?.focusY ??
			(this.viewportHeight > 0 ? (this.viewportHeight / 2 - this.camera.y) / this.camera.zoom : 0);
		const newMap = new Map(this.savedCardState);
		newMap.set(this.focusedCardId, { focusY, linkTarget, linkFocusActive });
		this.savedCardState = newMap;
	}

	// Get saved card state for restoration
	getSavedCardState(): { linkTarget?: string; linkFocusActive?: boolean } | null {
		if (!this.focusedCardId) return null;
		return this.savedCardState.get(this.focusedCardId) ?? null;
	}

	// Clear saved state for a card (used when deleting card or navigating far away)
	clearSavedCardState(cardId: string): void {
		if (this.savedCardState.has(cardId)) {
			const newMap = new Map(this.savedCardState);
			newMap.delete(cardId);
			this.savedCardState = newMap;
		}
	}

	// Check if the focused card is still within the viewport's reading zone
	// The reading zone is the viewport minus margins on each side
	// Vertical scrolling is allowed (reading), horizontal panning away is not
	isCardInReadingZone(viewportWidth: number, viewportHeight: number, margin: number = 100): boolean {
		if (!this.focusedCardId) return true;
		const card = this.cards.get(this.focusedCardId);
		if (!card) return true;

		// Convert viewport bounds to canvas coordinates
		const zoom = this.camera.zoom;
		const viewportLeft = -this.camera.x / zoom;
		const viewportRight = (-this.camera.x + viewportWidth) / zoom;
		const viewportTop = -this.camera.y / zoom;
		const viewportBottom = (-this.camera.y + viewportHeight) / zoom;

		// Card bounds
		const cardLeft = card.position.x;
		const cardRight = card.position.x + card.dimensions.width;
		const cardTop = card.position.y;
		const cardBottom = card.position.y + card.dimensions.height;

		// Reading zone (viewport with margins)
		const zoneLeft = viewportLeft + margin / zoom;
		const zoneRight = viewportRight - margin / zoom;
		const zoneTop = viewportTop + margin / zoom;
		const zoneBottom = viewportBottom - margin / zoom;

		// Card is in reading zone if it overlaps horizontally with the zone
		// and at least part of it is visible vertically
		const horizontalOverlap = cardRight > zoneLeft && cardLeft < zoneRight;
		const verticalVisible = cardBottom > viewportTop && cardTop < viewportBottom;

		return horizontalOverlap && verticalVisible;
	}

	// Clear saved state for current card if it's been panned out of the reading zone
	clearSavedStateIfNotInReadingZone(viewportWidth: number, viewportHeight: number, margin: number = 100): void {
		if (!this.focusedCardId) return;
		if (!this.isCardInReadingZone(viewportWidth, viewportHeight, margin)) {
			this.clearSavedCardState(this.focusedCardId);
		}
	}

	focusNextLink(linkCount: number): void {
		if (this.focusedLinkIndex === null || linkCount === 0) return;
		this.focusedLinkIndex = (this.focusedLinkIndex + 1) % linkCount;
	}

	focusPrevLink(linkCount: number): void {
		if (this.focusedLinkIndex === null || linkCount === 0) return;
		this.focusedLinkIndex = (this.focusedLinkIndex - 1 + linkCount) % linkCount;
	}

	/**
	 * Navigate left in chain with optional close behavior.
	 * @param keepOpen - If true, don't close the current card (Ctrl+Left behavior)
	 */
	navigateLeftInChain(keepOpen: boolean = false): boolean {
		if (!this.focusedCardId) return false;

		const currentIndex = this.activeChain.indexOf(this.focusedCardId);
		if (currentIndex <= 0) return false;

		const targetCardId = this.activeChain[currentIndex - 1];

		// Default behavior: close the card we're leaving (Miller Columns pattern)
		// BUT: don't close if we're at index 1 (would leave only the root card)
		if (!keepOpen && currentIndex > 1) {
			this.unopenCurrentCard();
		}

		this.focusCard(targetCardId);
		return true;
	}

	// Chain navigation: move right in chain
	navigateRightInChain(): boolean {
		if (!this.focusedCardId) return false;

		const currentIndex = this.activeChain.indexOf(this.focusedCardId);
		if (currentIndex < 0 || currentIndex >= this.activeChain.length - 1) {
			return false;
		}

		const targetCardId = this.activeChain[currentIndex + 1];
		this.focusCard(targetCardId);
		return true;
	}

	// Follow link and extend chain rightward
	// Does NOT call openNote to avoid chain manipulation conflicts
	followLinkToRight(
		noteId: string,
		fromCardId: string,
		sourceBounds: SourceBounds,
		linkSide?: LinkSide
	): boolean {
		// If note is already open, update chain and focus it
		if (this.cards.has(noteId)) {
			// Update chain to reflect navigation to this card
			const currentIndex = this.activeChain.indexOf(fromCardId);
			if (currentIndex >= 0) {
				// Truncate chain after current position, append target
				this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), noteId];
			}
			this.focusCard(noteId);
			return true;
		}

		// Card doesn't exist - create it
		if (!this.vault) return false;
		const note = this.vault.notes[noteId];
		if (!note) return false;
		if (this.cards.size >= MAX_CARDS) return false;

		// Use center of link bounds for placement calculations
		const linkCenter: Point = { x: (sourceBounds.left + sourceBounds.right) / 2, y: sourceBounds.y };

		// Calculate dimensions and position (uses cache)
		const dimensions = this.calculateCardDimensions(note.content, noteId);
		const parentCard = this.cards.get(fromCardId) ?? null;
		const existingCards = Array.from(this.cards.values());
		const existingPathPoints = this.getExistingPathPoints();

		const { position } = calculateNewCardPosition(
			parentCard,
			existingCards,
			linkCenter,
			dimensions,
			existingPathPoints,
			linkSide
		);

		// Create new card
		const newCard: Card = {
			id: noteId,
			note,
			position,
			dimensions,
			parentId: fromCardId,
			sourceLink: linkCenter
		};
		const newCards = new Map(this.cards);
		newCards.set(noteId, newCard);
		this.cards = newCards;

		// Add connection with full bounds for line start calculation
		this.connections = [
			...this.connections,
			{
				fromCardId,
				toCardId: noteId,
				sourceBounds
			}
		];

		// Update chain: truncate after current, append new
		const currentIndex = this.activeChain.indexOf(fromCardId);
		if (currentIndex >= 0) {
			this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), noteId];
		} else {
			this.activeChain = [...this.activeChain, noteId];
		}

		// Update history
		this.history.back.push([...this.activeChain]);
		this.history.forward = [];

		this.focusCard(noteId);
		this.persistState();
		this.schedulePersist();
		return true;
	}

	// Unopen current card (remove from view, NOT delete data)
	// NOTE: Entry point has privileged position - design decision pending review
	unopenCurrentCard(): boolean {
		if (!this.focusedCardId) return false;

		// Don't allow unopening the entry point (prevents soft lock)
		if (this.vault && this.focusedCardId === this.vault.entryPoint) return false;

		const cardToUnopen = this.focusedCardId;
		const currentIndex = this.activeChain.indexOf(cardToUnopen);

		// Find adjacent card (prefer left/parent in chain)
		const parentCardId = currentIndex > 0
			? this.activeChain[currentIndex - 1]
			: (this.activeChain.length > 1 ? this.activeChain[1] : null);

		// Remove card from canvas (NOT from database)
		const newCards = new Map(this.cards);
		newCards.delete(cardToUnopen);
		this.cards = newCards;

		// Clean up connections referencing this card
		this.connections = this.connections.filter(
			conn => conn.fromCardId !== cardToUnopen && conn.toCardId !== cardToUnopen
		);

		// Clean up stored paths
		const keysToDelete: string[] = [];
		for (const [key] of this.storedPaths) {
			if (key.includes(cardToUnopen)) {
				keysToDelete.push(key);
			}
		}
		if (keysToDelete.length > 0) {
			const newPaths = new Map(this.storedPaths);
			for (const key of keysToDelete) {
				newPaths.delete(key);
			}
			this.storedPaths = newPaths;
		}

		// Clean up saved reading state for this card
		this.clearSavedCardState(cardToUnopen);

		// Remove from active chain
		this.activeChain = this.activeChain.filter(id => id !== cardToUnopen);

		// Exit link focus mode
		this.exitLinkFocusMode();

		// Navigate to parent in chain or first remaining card
		if (parentCardId && this.cards.has(parentCardId)) {
			this.focusCard(parentCardId);
		} else if (this.activeChain.length > 0) {
			this.focusCard(this.activeChain[0]);
		} else {
			this.focusedCardId = null;
		}

		this.persistState();
		this.schedulePersist();
		return true;
	}

	updateCardHeight(cardId: string, height: number): void {
		const card = this.cards.get(cardId);
		if (!card || card.dimensions.height === height) return;

		const newCards = new Map(this.cards);
		newCards.set(cardId, {
			...card,
			dimensions: { ...card.dimensions, height }
		});
		this.cards = newCards;
		this.schedulePersist();
	}

	toggleLines(): void {
		this.showLines = !this.showLines;
	}

	toggleDebugMode(): void {
		this.debugMode = !this.debugMode;
	}

	isInActiveChain(cardId: string): boolean {
		return this.activeChain.includes(cardId);
	}

	isCurrentCard(cardId: string): boolean {
		return this.activeChain[this.activeChain.length - 1] === cardId;
	}

	isConnectionActive(conn: Connection): boolean {
		const fromIndex = this.activeChain.indexOf(conn.fromCardId);
		const toIndex = this.activeChain.indexOf(conn.toCardId);
		return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1;
	}

	/**
	 * Store a computed path for a connection (pen-and-paper: paths are frozen once drawn).
	 */
	storePath(fromCardId: string, toCardId: string, path: StoredPath): void {
		const key = `${fromCardId}-${toCardId}`;
		const newPaths = new Map(this.storedPaths);
		newPaths.set(key, path);
		this.storedPaths = newPaths;
	}

	/**
	 * Get stored path for a connection.
	 */
	getStoredPath(fromCardId: string, toCardId: string): StoredPath | null {
		const key = `${fromCardId}-${toCardId}`;
		return this.storedPaths.get(key) || null;
	}

	/**
	 * Get all existing path point arrays (for collision detection).
	 */
	getExistingPathPoints(): Point[][] {
		return Array.from(this.storedPaths.values()).map(p => p.points);
	}

	private persistState(): void {
		const lastNote = this.activeChain[this.activeChain.length - 1];

		// Serialize cards (without note content, just references)
		const serializedCards = Array.from(this.cards.values()).map(card => ({
			id: card.id,
			noteId: card.note.id,
			position: card.position,
			dimensions: card.dimensions,
			parentId: card.parentId,
			sourceLink: card.sourceLink
		}));

		savePersistedState(this.currentCanvasId, {
			lastViewedNoteId: lastNote || null,
			cameraState: this.camera,
			cards: serializedCards,
			connections: [...this.connections],
			activeChain: [...this.activeChain]
		});
	}

	/**
	 * Hard reset: clears all canvas state including database positions and localStorage.
	 * Reopens only the entry point note.
	 */
	async hardReset(): Promise<void> {
		if (!this.currentCanvasId) return;

		// 1. Clear database positions
		try {
			await fetch(`/api/canvases/${this.currentCanvasId}/positions`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ positions: [] })
			});
		} catch (err) {
			console.error('Failed to clear database positions:', err);
		}

		// 2. Clear localStorage
		const storageKey = `spatial-reader-state-${this.currentCanvasId}`;
		localStorage.removeItem(storageKey);

		// 3. Reset all in-memory state
		this.cards = new Map();
		this.connections = [];
		this.storedPaths = new Map();
		this.activeChain = [];
		this.history = { back: [], forward: [] };
		this.focusedCardId = null;
		this.editingCardId = null;
		this.focusedLinkIndex = null;
		this.savedCardState = new Map();
		this.camera = { x: 0, y: 0, zoom: 1 };

		// 4. Reopen entry point
		if (this.vault) {
			const entry = this.vault.notes[this.vault.entryPoint];
			if (entry) {
				this.openNote(entry.id, null, null);
			}
		}
	}

	/**
	 * Create an orphan card (a card with no parent).
	 * The card is positioned in a designated orphan area above the main canvas.
	 */
	async createOrphanCard(noteId: string, title: string): Promise<boolean> {
		if (!this.vault) return false;

		// Check card limit
		if (this.cards.size >= MAX_CARDS) {
			return false;
		}

		// Create note in vault if it doesn't exist
		if (!this.vault.notes[noteId]) {
			this.addNoteToVault(noteId, title);
		}

		const note = this.vault.notes[noteId];
		if (!note) return false;

		// Check if already open
		if (this.cards.has(noteId)) {
			this.focusCard(noteId);
			return true;
		}

		// Calculate dimensions (uses cache)
		const dimensions = this.calculateCardDimensions(note.content, noteId);

		// Calculate orphan position - place above existing cards
		const position = this.calculateOrphanPosition(dimensions);

		// Create new card without parent
		const newCard: Card = {
			id: noteId,
			note,
			position,
			dimensions,
			parentId: null,
			sourceLink: null
		};

		// Update state
		const newCards = new Map(this.cards);
		newCards.set(noteId, newCard);
		this.cards = newCards;

		// Update navigation
		this.history.back.push([...this.activeChain]);
		this.history.forward = [];
		this.activeChain = [...this.activeChain, noteId];

		// Focus on new card
		this.focusCard(noteId);

		this.persistState();
		this.schedulePersist();
		return true;
	}

	/**
	 * Calculate position for a new orphan card.
	 * Places orphans in a row above the main canvas content.
	 */
	private calculateOrphanPosition(dimensions: Dimensions): Point {
		const ORPHAN_Y_OFFSET = -400; // Place above origin
		const ORPHAN_SPACING = 50;

		// Find existing orphan cards (cards with no parent that aren't the entry point)
		const orphanCards = Array.from(this.cards.values()).filter(
			c => c.parentId === null && (!this.vault || c.id !== this.vault.entryPoint)
		);

		// Calculate X position based on existing orphans
		let x = 0;
		if (orphanCards.length > 0) {
			// Place after the rightmost orphan
			const rightmostOrphan = orphanCards.reduce((max, card) =>
				card.position.x + card.dimensions.width > max.position.x + max.dimensions.width ? card : max
			);
			x = rightmostOrphan.position.x + rightmostOrphan.dimensions.width + ORPHAN_SPACING;
		}

		return { x, y: ORPHAN_Y_OFFSET };
	}

	/**
	 * Get all orphan cards (cards with no parent, excluding entry point).
	 */
	getOrphanCards(): Card[] {
		return Array.from(this.cards.values()).filter(
			c => c.parentId === null && (!this.vault || c.id !== this.vault.entryPoint)
		);
	}

	/**
	 * Get bounding box of all cards (for zoom to fit).
	 */
	getBoundingBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
		if (this.cards.size === 0) return null;

		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		for (const card of this.cards.values()) {
			minX = Math.min(minX, card.position.x);
			minY = Math.min(minY, card.position.y);
			maxX = Math.max(maxX, card.position.x + card.dimensions.width);
			maxY = Math.max(maxY, card.position.y + card.dimensions.height);
		}

		return { minX, minY, maxX, maxY };
	}

	/**
	 * Open all links in order (BFS from root, alphabetically within each level).
	 * Returns a promise that resolves when all links are opened.
	 */
	async openAllLinks(): Promise<void> {
		if (!this.vault) return;

		// Process cards level by level (BFS)
		const processedCards = new Set<string>();
		let currentLevel = [...this.cards.keys()];

		while (currentLevel.length > 0) {
			const nextLevel: string[] = [];

			// Sort current level alphabetically
			currentLevel.sort();

			for (const cardId of currentLevel) {
				if (processedCards.has(cardId)) continue;
				processedCards.add(cardId);

				const card = this.cards.get(cardId);
				if (!card) continue;

				// Get all wikilinks from this card's note, sorted alphabetically
				const links = [...card.note.wikilinks].sort();

				for (const linkTarget of links) {
					// Skip broken links and already open cards
					if (this.brokenLinks.has(linkTarget)) continue;
					if (this.cards.has(linkTarget)) continue;
					if (this.cards.size >= MAX_CARDS) break;

					// Simulate clicking the link - use synthetic bounds
					// For programmatic opening, left=right since we don't have actual link width
					const syntheticX = card.position.x + 50;
					const syntheticY = card.position.y + 50 + (links.indexOf(linkTarget) * 20);
					const sourceBounds: SourceBounds = {
						left: syntheticX,
						right: syntheticX,
						y: syntheticY
					};

					this.openNote(linkTarget, cardId, sourceBounds);
					nextLevel.push(linkTarget);

					// Small delay to allow rendering
					await new Promise(r => setTimeout(r, 50));
				}
			}

			currentLevel = nextLevel;
		}

		// Dispatch compute-paths event to generate all connection lines
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('canvas-compute-paths'));
		}

		// Dispatch zoom to fit event after all links opened
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('canvas-zoom-to-fit'));
		}
	}

	/**
	 * Request zoom to fit all cards.
	 */
	zoomToFit(): void {
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('canvas-zoom-to-fit'));
		}
	}
}

export const canvasStore = new CanvasStore();

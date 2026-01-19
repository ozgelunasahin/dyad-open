import type { Card, Connection, Camera, Point, Vault, Dimensions, LinkSide, SourceBounds } from '$lib/types';
import type { JSONContent } from '@tiptap/core';
import { MAX_CARDS, CARD_WIDTH } from '$lib/types';
import { calculateNewCardPosition } from '$lib/utils/layout';
import { estimateContentHeight } from '$lib/utils/json-content';

// Visibility state for conservative panning
export type VisibilityState = 'fully-visible' | 'partially-visible' | 'off-screen';

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
	private lastAnimationEndTime = 0; // Timestamp when last animation ended

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

	// Hidden chains - stores downstream cards that were hidden together
	// Key format: "parentCardId-childCardId" -> array of all hidden card IDs (including the child)
	// Used to reopen entire chains when a link is followed again
	private hiddenChains = $state<Map<string, string[]>>(new Map());

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

	// Debounce flag for path computation requests
	// Prevents multiple requestAnimationFrame callbacks from queuing up
	private pathComputationRequested = false;

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
		this.hiddenChains = new Map();
		this.savedCardState = new Map(); // Clear stale reading positions

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
			const height = estimateContentHeight(note.content, CARD_WIDTH);
			newDimensionCache.set(noteId, { width: CARD_WIDTH, height: Math.max(100, height) });
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
			const canvasIdPrefix = `${this.currentCanvasId}-`;
			const extractNoteId = (parentCardId: string | null): string | null => {
				if (!parentCardId) return null;
				// parentCardId format is "canvasId-noteId", strip the known canvasId prefix
				if (parentCardId.startsWith(canvasIdPrefix)) {
					return parentCardId.substring(canvasIdPrefix.length);
				}
				// Fallback: return as-is if prefix doesn't match
				return parentCardId;
			};

			for (const pos of savedPositions) {
				const note = vault.notes[pos.noteId];
				if (note) {
					// Use noteId as the card id (consistent with rest of codebase)
					restoredCards.set(pos.noteId, {
						id: pos.noteId,
						note,
						position: { x: pos.x, y: pos.y },
						dimensions: { width: CARD_WIDTH, height: pos.height },
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
				const newConnections: Connection[] = [];
				for (const card of restoredCards.values()) {
					if (card.parentId && restoredCards.has(card.parentId)) {
						// Convert legacy sourceLink Point to SourceBounds
						const legacyPoint = card.sourceLink || { x: card.position.x, y: card.position.y };
						newConnections.push({
							fromCardId: card.parentId,
							toCardId: card.id,
							sourceBounds: { left: legacyPoint.x, right: legacyPoint.x, y: legacyPoint.y }
						});
					}
				}
				this.connections = newConnections;
				// Build active chain (cards without children at end)
				this.activeChain = Array.from(restoredCards.keys());

				// Focus on last card
				const lastCard = this.activeChain[this.activeChain.length - 1];
				if (lastCard) {
					this.focusCard(lastCard);
				}

				// Trigger path computation after Canvas component mounts
				this.requestPathComputation();
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
						dimensions: { width: CARD_WIDTH, height: savedCard.dimensions.height },
						parentId: savedCard.parentId,
						sourceLink: savedCard.sourceLink
					});
				}
			}

			if (restoredCards.size > 0) {
				this.cards = restoredCards;

				// Filter connections and activeChain to only include cards that were restored
				const validCardIds = new Set(restoredCards.keys());
				this.connections = (persisted.connections || []).filter(
					(conn) => validCardIds.has(conn.fromCardId) && validCardIds.has(conn.toCardId)
				);
				this.activeChain = (persisted.activeChain || []).filter((id) => validCardIds.has(id));

				// Focus on the current card (if it's still valid)
				const currentCardId = this.activeChain[this.activeChain.length - 1];
				if (currentCardId && this.cards.has(currentCardId)) {
					this.focusCard(currentCardId);
				} else if (restoredCards.size > 0) {
					// Fallback to first restored card
					const firstCardId = Array.from(restoredCards.keys())[0];
					this.focusCard(firstCardId);
				}

				// Migrate to DB
				this.persistToDatabase();

				// Trigger path computation after Canvas component mounts
				this.requestPathComputation();
				return;
			}
		}

		// Fallback: Open the entry note
		console.log('[Store] Opening entry note');

		// Handle empty vault (new user with no notes)
		const noteIds = Object.keys(vault.notes);
		if (noteIds.length === 0) {
			console.log('[Store] Vault is empty - no notes to display');
			return;
		}

		// Try to find a valid entry note, ignoring stale localStorage references
		let entryNoteId = vault.entryPoint;

		// Only use persisted lastViewedNoteId if it exists in the current vault
		if (persisted?.lastViewedNoteId && vault.notes[persisted.lastViewedNoteId]) {
			entryNoteId = persisted.lastViewedNoteId;
		}

		// Fallback to first available note if entryPoint doesn't exist
		const entryNote = vault.notes[entryNoteId] || vault.notes[noteIds[0]];
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
	 * Request path computation with debouncing.
	 * Multiple calls within the same frame are coalesced into one event dispatch.
	 */
	private requestPathComputation(): void {
		if (this.pathComputationRequested) return;
		this.pathComputationRequested = true;

		requestAnimationFrame(() => {
			this.pathComputationRequested = false;
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('canvas-compute-paths'));
			}
		});
	}

	/**
	 * Calculate dimensions for a note's content.
	 * Uses cache if available, otherwise calculates and caches.
	 * All cards use fixed CARD_WIDTH for visual consistency.
	 */
	private calculateCardDimensions(content: JSONContent, noteId?: string): Dimensions {
		// Use cache if available
		if (noteId && this.dimensionCache.has(noteId)) {
			return this.dimensionCache.get(noteId)!;
		}

		// Calculate dimensions with fixed width (for dynamically created notes)
		const height = estimateContentHeight(content, CARD_WIDTH);
		const dimensions = { width: CARD_WIDTH, height: Math.max(100, height) };

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

		// Calculate position using line-aware reactive algorithm
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
				content: [{ type: 'paragraph' }]
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
	 *
	 * Core principle: Consistency is king. The panning behavior must be identical
	 * whether navigating via clicks, links, or keyboard.
	 *
	 * Fundamental rule:
	 * - If we did NOT pan to go TO a card, we do NOT need to pan to go BACK
	 * - If we DID pan to go to a card, we DO need to pan to go back
	 *
	 * Implementation:
	 * - FIRST determine if we will pan (based on visibility + saved state)
	 * - ONLY save current card's reading position if we ARE going to pan
	 * - This creates symmetry: no pan forward = no saved state = no pan back
	 */
	focusCard(cardId: string, forceAnimation: boolean = false): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		// Exit edit mode when focusing a different card
		if (this.editingCardId && this.editingCardId !== cardId) {
			this.exitEditMode();
		}

		const previousCardId = this.focusedCardId;
		const visibility = this.getCardVisibility(cardId);
		const savedState = this.savedCardState.get(cardId);
		console.log('[ReadingPos] focusCard:', cardId, 'visibility:', visibility, 'savedState:', savedState ? { focusY: savedState.focusY } : null);

		// Prepare link restoration info (needed for all paths)
		const linkRestoration = savedState?.linkFocusActive
			? { linkTarget: savedState.linkTarget, linkFocusActive: true }
			: null;

		// STEP 1: Determine if we WILL pan (before saving any state)
		// This is the key insight: decide pan first, then conditionally save
		let willPan = true;
		let panType: 'none' | 'minimal' | 'full' = 'full';
		let minPan: { dx: number; dy: number } | null = null;

		// If target card has saved reading position, we MUST pan to restore it
		// (saved state exists = we panned to get here originally = pan back)
		const hasSavedReadingPosition = savedState?.focusY !== undefined;

		if (forceAnimation) {
			willPan = true;
			panType = 'full';
		} else if (hasSavedReadingPosition) {
			// Saved state means we panned away from this card, so pan back to restore
			willPan = true;
			panType = 'full';
		} else {
			// No saved state - use conservative panning based on visibility
			if (visibility === 'fully-visible') {
				willPan = false;
				panType = 'none';
			} else if (visibility === 'partially-visible') {
				minPan = this.calculateMinimalPan(cardId);
				if (minPan) {
					willPan = true;
					panType = 'minimal';
				} else {
					willPan = false;
					panType = 'none';
				}
			} else {
				// off-screen
				willPan = true;
				panType = 'full';
			}
		}

		// STEP 2: Save current card's state ONLY if we're going to pan
		// This is the fundamental insight: no pan = no saved state = no pan back
		if (previousCardId && previousCardId !== cardId && willPan) {
			const inReadingZone = this.viewportWidth > 0 && this.viewportHeight > 0
				? this.isCardInReadingZone(this.viewportWidth, this.viewportHeight, 100)
				: true;

			if (!inReadingZone) {
				// Card panned out of view - clear saved state
				console.log('[ReadingPos] focusCard: clearing state for', previousCardId, '(out of reading zone)');
				this.clearSavedCardState(previousCardId);
			} else {
				// Card still in reading zone - save vertical focus position
				const focusY = this.viewportHeight > 0
					? (this.viewportHeight / 2 - this.camera.y) / this.camera.zoom
					: 0;
				const existing = this.savedCardState.get(previousCardId);
				const newMap = new Map(this.savedCardState);
				newMap.set(previousCardId, { ...existing, focusY });
				this.savedCardState = newMap;
				console.log('[ReadingPos] focusCard: saved state for', previousCardId, 'focusY:', Math.round(focusY), 'willPan:', willPan, 'panType:', panType);
			}
		}

		// STEP 3: Update focus
		this.focusedCardId = cardId;

		// STEP 4: Execute pan (or not)
		if (!willPan) {
			// No pan needed - just dispatch instant focus event for link restoration
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('canvas-focus-instant', {
					detail: { cardId, linkRestoration }
				}));
			}
			return;
		}

		// Dispatch appropriate animation event
		if (typeof window !== 'undefined') {
			this.isAnimating = true;

			if (panType === 'minimal' && minPan) {
				window.dispatchEvent(new CustomEvent('canvas-minimal-pan', {
					detail: { cardId, dx: minPan.dx, dy: minPan.dy, linkRestoration }
				}));
			} else if (hasSavedReadingPosition) {
				// Restore to saved position (we panned away, now pan back)
				console.log('[ReadingPos] focusCard: RESTORING saved position for', cardId, 'focusY:', savedState!.focusY);
				window.dispatchEvent(new CustomEvent('canvas-restore', {
					detail: {
						focusY: savedState!.focusY,
						cardId: card.id,
						linkRestoration
					}
				}));
			} else {
				// New card - animate to reading position
				window.dispatchEvent(new CustomEvent('canvas-focus', {
					detail: {
						x: card.position.x + card.dimensions.width / 2,
						y: card.position.y,
						cardId: card.id,
						linkRestoration
					}
				}));
			}
		}
	}

	/**
	 * Focus a card without animating to it (for first-click behavior).
	 * Just sets the focused card - does NOT save current card's state.
	 * A second click will trigger pan to reading position.
	 *
	 * Core principle: no pan = no saved state. Since this function doesn't pan,
	 * it doesn't save reading position. This ensures consistent behavior.
	 */
	focusCardWithoutAnimation(cardId: string): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		// Exit edit mode when focusing a different card
		if (this.editingCardId && this.editingCardId !== cardId) {
			this.exitEditMode();
		}

		// Just set focus, no animation, no state save
		// (consistent with "no pan = no saved state" principle)
		this.focusedCardId = cardId;
	}

	/**
	 * Pan focused card into view if needed.
	 * Called on click when card is already focused.
	 *
	 * - Fully visible (including large cards in reading zone): do nothing
	 * - Partially visible (edges cut off): pan to saved reading position or minimal pan
	 * - Off-screen: pan to saved reading position or card top
	 */
	panToFocusedCard(): void {
		const card = this.focusedCardId ? this.cards.get(this.focusedCardId) : null;
		if (!card) return;

		const visibility = this.getCardVisibility(this.focusedCardId!);
		const savedState = this.savedCardState.get(this.focusedCardId!);

		// Fully visible: do nothing
		if (visibility === 'fully-visible') {
			return;
		}

		// Card is partially visible or off-screen - pan to reading position
		if (typeof window !== 'undefined') {
			this.isAnimating = true;

			if (savedState?.focusY !== undefined) {
				// Restore to saved reading position
				window.dispatchEvent(new CustomEvent('canvas-restore', {
					detail: { focusY: savedState.focusY, cardId: card.id, linkRestoration: null }
				}));
			} else {
				// No saved position - pan to card top
				window.dispatchEvent(new CustomEvent('canvas-focus', {
					detail: {
						x: card.position.x + card.dimensions.width / 2,
						y: card.position.y,
						cardId: card.id,
						linkRestoration: null
					}
				}));
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
		if (!animating) {
			// Record when animation ended to prevent immediate reading position saves
			this.lastAnimationEndTime = Date.now();
		}
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

	/**
	 * Update reading position for the focused card continuously as user scrolls/pans.
	 * Called from Canvas component on camera changes when card is visible.
	 */
	updateReadingPosition(): void {
		if (!this.focusedCardId) return;
		if (this.viewportHeight === 0) return;

		// Don't save reading position right after an animation ends
		// This prevents the animation's end position from overwriting the user's actual reading position
		const timeSinceAnimation = Date.now() - this.lastAnimationEndTime;
		if (timeSinceAnimation < 200) return;

		// Only update if focused card is visible
		const visibility = this.getCardVisibility(this.focusedCardId);
		if (visibility === 'off-screen') return;

		// Calculate current reading position (viewport center in canvas coordinates)
		const focusY = (this.viewportHeight / 2 - this.camera.y) / this.camera.zoom;

		// Update saved state, preserving link state
		const existing = this.savedCardState.get(this.focusedCardId);
		const newMap = new Map(this.savedCardState);
		newMap.set(this.focusedCardId, { ...existing, focusY });
		this.savedCardState = newMap;

		// Debug logging removed - generates too much noise during panning
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

	/**
	 * Determine card visibility state relative to viewport.
	 * Used for conservative panning - only pan when necessary.
	 *
	 * Returns:
	 * - 'fully-visible': Card is in reading position (top visible, horizontally in view)
	 *   This includes large cards that extend beyond viewport - they're "in view" for reading
	 * - 'partially-visible': Card overlaps viewport but top/sides are cut off - needs panning
	 * - 'off-screen': Card has no overlap with viewport - full pan needed
	 */
	getCardVisibility(cardId: string): VisibilityState {
		const card = this.cards.get(cardId);
		if (!card) return 'off-screen';
		if (this.viewportWidth === 0 || this.viewportHeight === 0) return 'off-screen';

		const margin = 50;
		const zoom = this.camera.zoom;

		// Convert card bounds to screen coordinates
		const screenLeft = card.position.x * zoom + this.camera.x;
		const screenTop = card.position.y * zoom + this.camera.y;
		const screenRight = screenLeft + card.dimensions.width * zoom;
		const screenBottom = screenTop + card.dimensions.height * zoom;

		// Check if any overlap with viewport first
		const anyOverlap = (
			screenRight > 0 &&
			screenLeft < this.viewportWidth &&
			screenBottom > 0 &&
			screenTop < this.viewportHeight
		);

		if (!anyOverlap) return 'off-screen';

		// Card overlaps viewport - check if it's in a good reading position
		// "Fully visible" means card is in a readable state - we don't need to pan
		const horizontallyFits = screenLeft >= margin && screenRight <= this.viewportWidth - margin;

		if (!horizontallyFits) {
			// Sides cut off - needs horizontal panning
			return 'partially-visible';
		}

		// Horizontally fits - now check vertical positioning
		// A card is "fully visible" if:
		// 1. Top is in reading position (not cut off at top), OR
		// 2. User has scrolled down in a tall card (top is above viewport, but content is on screen)
		const topCutOff = screenTop < margin;
		const topBelowViewport = screenTop >= this.viewportHeight - margin;

		if (topBelowViewport) {
			// Top hasn't even entered viewport yet - card is barely visible at bottom
			return 'partially-visible';
		}

		if (topCutOff) {
			// Top is above viewport (user scrolled down in tall card)
			// This is fine - user is actively reading. Consider it "fully visible"
			return 'fully-visible';
		}

		// Top is in view and horizontally fits - fully visible
		return 'fully-visible';
	}

	/**
	 * Calculate the smallest camera translation to make card fully visible.
	 * Returns null if card is already fully visible.
	 * Used for minimal panning when card is partially visible.
	 */
	calculateMinimalPan(cardId: string): { dx: number; dy: number } | null {
		const card = this.cards.get(cardId);
		if (!card) return null;
		if (this.viewportWidth === 0 || this.viewportHeight === 0) return null;

		const margin = 50;
		const zoom = this.camera.zoom;

		// Convert card bounds to screen coordinates
		const screenLeft = card.position.x * zoom + this.camera.x;
		const screenTop = card.position.y * zoom + this.camera.y;
		const screenRight = screenLeft + card.dimensions.width * zoom;
		const screenBottom = screenTop + card.dimensions.height * zoom;

		let dx = 0;
		let dy = 0;

		// Calculate horizontal adjustment
		if (screenLeft < margin) {
			dx = margin - screenLeft;  // Pan right to show left edge
		} else if (screenRight > this.viewportWidth - margin) {
			dx = (this.viewportWidth - margin) - screenRight;  // Pan left to show right edge
		}

		// Calculate vertical adjustment
		if (screenTop < margin) {
			dy = margin - screenTop;  // Pan down to show top edge
		} else if (screenBottom > this.viewportHeight - margin) {
			dy = (this.viewportHeight - margin) - screenBottom;  // Pan up to show bottom edge
		}

		return (dx === 0 && dy === 0) ? null : { dx, dy };
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

		// Default behavior: close the current card AND all downstream cards
		if (!keepOpen) {
			// Get all cards from current position to end of chain (downstream)
			const cardsToHide = this.activeChain.slice(currentIndex);

			if (cardsToHide.length > 0) {
				// Store as hidden chain, keyed by parent -> first hidden card
				const chainKey = `${targetCardId}-${cardsToHide[0]}`;
				const newHiddenChains = new Map(this.hiddenChains);
				newHiddenChains.set(chainKey, cardsToHide);
				this.hiddenChains = newHiddenChains;

				// Close all downstream cards (in reverse order to maintain integrity)
				// Use skipFocus=true so we control focus at the end
				for (let i = cardsToHide.length - 1; i >= 0; i--) {
					this.unopenCard(cardsToHide[i], true);
				}
			}
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
		// Check if there's a hidden chain to restore
		const chainKey = `${fromCardId}-${noteId}`;
		const hiddenChain = this.hiddenChains.get(chainKey);

		if (hiddenChain && hiddenChain.length > 0) {
			// Restore the entire hidden chain
			return this.restoreHiddenChain(chainKey, hiddenChain, fromCardId, sourceBounds);
		}

		// If note is already open, update chain and focus it
		if (this.cards.has(noteId)) {
			// Update chain to reflect navigation to this card
			const currentIndex = this.activeChain.indexOf(fromCardId);
			if (currentIndex >= 0) {
				// Truncate chain after current position, append target
				this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), noteId];
			}
			// Use same pan logic as clicking a card:
			// - If it's already focused, pan to reading position
			// - Otherwise, just focus without panning (user can click again to pan)
			if (this.focusedCardId === noteId) {
				this.panToFocusedCard();
			} else {
				this.focusCard(noteId);
			}
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

	/**
	 * Restore a previously hidden chain of cards.
	 * Reopens all cards in the chain and recreates their connections.
	 */
	private restoreHiddenChain(
		chainKey: string,
		cardIds: string[],
		parentCardId: string,
		sourceBounds: SourceBounds
	): boolean {
		if (!this.vault) return false;

		// Remove from hidden chains
		const newHiddenChains = new Map(this.hiddenChains);
		newHiddenChains.delete(chainKey);
		this.hiddenChains = newHiddenChains;

		// Batch compute all cards and connections FIRST, then update state ONCE
		// This prevents N map copies and N rerenders during chain restoration
		const cardsToAdd: Card[] = [];
		const connectionsToAdd: Connection[] = [];

		let prevCardId = parentCardId;
		let prevSourceBounds = sourceBounds;

		// Build a working copy of cards for position calculation
		const workingCards = new Map(this.cards);

		for (const cardId of cardIds) {
			const note = this.vault.notes[cardId];
			if (!note) continue;

			// Calculate dimensions
			const dimensions = this.calculateCardDimensions(note.content, cardId);

			// Calculate position relative to previous card
			const prevCard = workingCards.get(prevCardId);
			const linkCenter: Point = {
				x: (prevSourceBounds.left + prevSourceBounds.right) / 2,
				y: prevSourceBounds.y
			};

			const existingCards = Array.from(workingCards.values());
			const existingPathPoints = this.getExistingPathPoints();

			const { position } = calculateNewCardPosition(
				prevCard ?? null,
				existingCards,
				linkCenter,
				dimensions,
				existingPathPoints
			);

			// Create the card object
			const newCard: Card = {
				id: cardId,
				note,
				position,
				dimensions,
				parentId: prevCardId,
				sourceLink: linkCenter
			};

			// Add to batch arrays and working copy (for next iteration's position calc)
			cardsToAdd.push(newCard);
			workingCards.set(cardId, newCard);

			// Queue connection
			connectionsToAdd.push({
				fromCardId: prevCardId,
				toCardId: cardId,
				sourceBounds: prevSourceBounds
			});

			// Update for next iteration
			prevCardId = cardId;
			prevSourceBounds = {
				left: position.x + dimensions.width / 2,
				right: position.x + dimensions.width / 2,
				y: position.y + 50 // Approximate Y offset to first link
			};
		}

		// Single atomic state updates (triggers only one rerender)
		const newCards = new Map(this.cards);
		for (const card of cardsToAdd) {
			newCards.set(card.id, card);
		}
		this.cards = newCards;
		this.connections = [...this.connections, ...connectionsToAdd];

		// Update active chain
		const currentIndex = this.activeChain.indexOf(parentCardId);
		if (currentIndex >= 0) {
			this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), ...cardIds];
		} else {
			this.activeChain = [...this.activeChain, ...cardIds];
		}

		// Focus on the last card in the chain
		const lastCardId = cardIds[cardIds.length - 1];
		this.focusCard(lastCardId);

		// Trigger path computation
		this.requestPathComputation();

		this.persistState();
		this.schedulePersist();
		return true;
	}

	// Unopen a specific card by ID (remove from view, NOT delete data)
	// skipFocus: when true, don't change focus (used when bulk-closing from navigateLeftInChain)
	unopenCard(cardId: string, skipFocus: boolean = false): boolean {
		if (!this.cards.has(cardId)) return false;

		// Don't allow unopening the entry point
		if (this.vault && cardId === this.vault.entryPoint) return false;

		// Remove card from canvas
		const newCards = new Map(this.cards);
		newCards.delete(cardId);
		this.cards = newCards;

		// Clean up connections referencing this card
		this.connections = this.connections.filter(
			conn => conn.fromCardId !== cardId && conn.toCardId !== cardId
		);

		// Clean up stored paths (use exact matching to avoid partial ID collisions)
		const keysToDelete: string[] = [];
		for (const [key] of this.storedPaths) {
			if (this.pathKeyInvolvesCard(key, cardId)) {
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

		// Clean up saved reading state
		this.clearSavedCardState(cardId);

		// Clean up hidden chains that reference this card (use exact matching)
		const chainKeysToDelete: string[] = [];
		for (const [key, chain] of this.hiddenChains) {
			// Key format is "parentCardId-childCardId", use same matching pattern
			if (this.pathKeyInvolvesCard(key, cardId) || chain.includes(cardId)) {
				chainKeysToDelete.push(key);
			}
		}
		if (chainKeysToDelete.length > 0) {
			const newHiddenChains = new Map(this.hiddenChains);
			for (const key of chainKeysToDelete) {
				newHiddenChains.delete(key);
			}
			this.hiddenChains = newHiddenChains;
		}

		// Remove from active chain
		this.activeChain = this.activeChain.filter(id => id !== cardId);

		// If we closed the focused card, focus another (unless skipFocus is true)
		if (this.focusedCardId === cardId && !skipFocus) {
			if (this.activeChain.length > 0) {
				this.focusCard(this.activeChain[this.activeChain.length - 1]);
			} else {
				this.focusedCardId = null;
			}
		}

		this.persistState();
		this.schedulePersist();

		// Trigger path regeneration so remaining paths update their hops
		this.requestPathComputation();

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

		// Clean up stored paths (use exact matching to avoid partial ID collisions)
		const keysToDelete: string[] = [];
		for (const [key] of this.storedPaths) {
			if (this.pathKeyInvolvesCard(key, cardToUnopen)) {
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

		// Trigger path regeneration so remaining paths update their hops
		this.requestPathComputation();

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
	 * Check if a path key involves a specific card ID.
	 * Keys are formatted as "fromCardId-toCardId" with exact matches required.
	 */
	private pathKeyInvolvesCard(key: string, cardId: string): boolean {
		// Check if key starts with "cardId-" (card is source)
		if (key.startsWith(`${cardId}-`)) return true;
		// Check if key ends with "-cardId" (card is target)
		if (key.endsWith(`-${cardId}`)) return true;
		return false;
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
	 * Update a connection's sourceBounds and invalidate its path.
	 * Called when parent card's content reflows and wikilink positions change.
	 */
	updateConnectionSourceBounds(
		fromCardId: string,
		toCardId: string,
		newSourceBounds: SourceBounds
	): void {
		// Find and update the connection
		const connIndex = this.connections.findIndex(
			(c) => c.fromCardId === fromCardId && c.toCardId === toCardId
		);
		if (connIndex === -1) return;

		// Update connection with new sourceBounds
		this.connections = this.connections.map((c, i) =>
			i === connIndex ? { ...c, sourceBounds: newSourceBounds } : c
		);

		// Also update the card's sourceLink for persistence
		const card = this.cards.get(toCardId);
		if (card) {
			const centerX = (newSourceBounds.left + newSourceBounds.right) / 2;
			const newCards = new Map(this.cards);
			newCards.set(toCardId, {
				...card,
				sourceLink: { x: centerX, y: newSourceBounds.y }
			});
			this.cards = newCards;
		}

		// Invalidate the path
		const pathKey = `${fromCardId}-${toCardId}`;
		if (this.storedPaths.has(pathKey)) {
			const newPaths = new Map(this.storedPaths);
			newPaths.delete(pathKey);
			this.storedPaths = newPaths;
		}

		// Request path recomputation
		this.requestPathComputation();
	}

	/**
	 * Get all child cards of a given parent card.
	 */
	getChildCards(parentCardId: string): Card[] {
		return Array.from(this.cards.values()).filter(c => c.parentId === parentCardId);
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
		this.hiddenChains = new Map();
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
		this.requestPathComputation();

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

/**
 * Load vault from API (for Supabase-backed notes storage).
 * Returns a Vault object compatible with canvasStore.initialize().
 */
export async function loadVaultFromAPI(): Promise<Vault> {
	const response = await fetch('/api/notes');
	if (!response.ok) {
		throw new Error('Failed to load notes from API');
	}

	const notesArray = await response.json();

	// Convert array to vault structure
	const notes: Record<string, Vault['notes'][string]> = {};
	for (const note of notesArray) {
		notes[note.slug] = {
			id: note.slug,
			title: note.title,
			content: note.content,
			wikilinks: note.wikilinks || []
		};
	}

	return {
		entryPoint: notesArray[0]?.slug ?? '',
		notes
	};
}

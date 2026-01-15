import type { Card, Connection, Camera, Point, Vault, Dimensions, AStarExplorationFrame } from '$lib/types';
import { MAX_CARDS, DEFAULT_CARD_WIDTH, MIN_CARD_WIDTH, MAX_CARD_WIDTH } from '$lib/types';
import { calculateNewCardPosition } from '$lib/utils/layout';
import { measureMarkdownContent, calculateOptimalWidth } from '$lib/utils/measure';

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

	// Debug visualization state
	debugMode = $state<boolean>(false);
	debugExploration = $state<AStarExplorationFrame[]>([]);
	debugCurrentFrame = $state<number>(0);

	// Edit mode state
	editingCardId = $state<string | null>(null);

	// Current canvas ID for per-canvas state persistence
	private currentCanvasId: string | null = null;

	// Track position when leaving a card (for restoring on return)
	private previousCardState = $state<{ cardId: string; camera: Camera } | null>(null);
	// Track forward navigation (child we came from when going back)
	private forwardCardState = $state<{ cardId: string; camera: Camera } | null>(null);

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
		this.vault = vault;
		this.currentCanvasId = canvasId ?? null;

		// Clear previous state when switching canvases
		this.cards = new Map();
		this.connections = [];
		this.activeChain = [];
		this.storedPaths = new Map();
		this.focusedCardId = null;
		this.editingCardId = null;
		this.previousCardState = null;
		this.forwardCardState = null;
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
						this.connections.push({
							fromCardId: card.parentId,
							toCardId: card.id,
							sourcePoint: card.sourceLink || { x: card.position.x, y: card.position.y }
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
		const entryNoteId = persisted?.lastViewedNoteId || vault.entryPoint;
		const entryNote = vault.notes[entryNoteId] || vault.notes[vault.entryPoint];
		if (entryNote) {
			this.openNote(entryNote.id, null, null);
		}
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
	 */
	private calculateCardDimensions(content: string): Dimensions {
		// Calculate optimal width based on content
		const optimalWidth = calculateOptimalWidth(content, 1000, MIN_CARD_WIDTH, MAX_CARD_WIDTH);

		// Measure actual height at this width
		const measured = measureMarkdownContent(content, optimalWidth);

		return {
			width: optimalWidth,
			height: Math.max(100, measured.height) // Minimum height
		};
	}

	openNote(noteId: string, fromCardId: string | null, linkPosition: Point | null): boolean {
		if (!this.vault) return false;

		const note = this.vault.notes[noteId];
		if (!note) return false;

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

		// Calculate dimensions for new card
		const dimensions = this.calculateCardDimensions(note.content);

		// Get parent card if exists
		const parentCard = fromCardId ? this.cards.get(fromCardId) ?? null : null;
		const existingCards = Array.from(this.cards.values());

		// Calculate position using priority-based algorithm with crossing prevention
		// Pass existing path points (not connections) for collision detection
		const existingPathPoints = this.getExistingPathPoints();
		const { position, routingX } = calculateNewCardPosition(
			parentCard,
			existingCards,
			linkPosition,
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
			sourceLink: linkPosition
		};

		// Update state
		const newCards = new Map(this.cards);
		newCards.set(noteId, newCard);
		this.cards = newCards;

		// Add connection if has parent
		if (fromCardId && linkPosition) {
			this.connections = [
				...this.connections,
				{
					fromCardId,
					toCardId: noteId,
					sourcePoint: linkPosition,
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
	addNoteToVault(noteId: string, title: string): void {
		if (!this.vault) return;

		// Create a minimal note object
		const note = {
			id: noteId,
			title,
			content: `# ${title}\n\n`,
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
	 * Focus on a card and position for reading (top of card near top of viewport).
	 * If returning to the card we just came from, restore the previous scroll position.
	 */
	focusCard(cardId: string): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		// Check if we're returning to the previous card
		const isReturning = this.previousCardState?.cardId === cardId;
		const restoreCamera = isReturning && this.previousCardState ? this.previousCardState.camera : null;

		// Save current card's position before switching (if we have a focused card)
		if (this.focusedCardId && this.focusedCardId !== cardId) {
			this.previousCardState = {
				cardId: this.focusedCardId,
				camera: { ...this.camera }
			};
		}

		this.focusedCardId = cardId;

		// Dispatch event for Canvas to animate
		if (typeof window !== 'undefined') {
			this.isAnimating = true;

			if (restoreCamera) {
				// Returning to previous card - restore exact position
				window.dispatchEvent(
					new CustomEvent('canvas-restore', {
						detail: { camera: restoreCamera }
					})
				);
			} else {
				// New card - animate to reading position
				window.dispatchEvent(
					new CustomEvent('canvas-focus', {
						detail: {
							x: card.position.x + card.dimensions.width / 2,
							y: card.position.y, // Card top, not center
							cardId: card.id
						}
					})
				);
			}
		}
	}

	/**
	 * Get the parent card of the currently focused card.
	 */
	getParentCardId(): string | null {
		if (!this.focusedCardId) return null;
		const card = this.cards.get(this.focusedCardId);
		return card?.parentId || null;
	}

	/**
	 * Return to the parent card of the currently focused card.
	 * Saves current card as forward target for right arrow navigation.
	 */
	returnToParent(): boolean {
		const parentId = this.getParentCardId();
		if (!parentId || !this.focusedCardId) return false;

		// Save current card as forward target (so right arrow can return here)
		this.forwardCardState = {
			cardId: this.focusedCardId,
			camera: { ...this.camera }
		};

		this.focusCard(parentId);
		return true;
	}

	/**
	 * Check if we can go forward (have a forward target).
	 */
	canGoForwardToChild(): boolean {
		return this.forwardCardState !== null;
	}

	/**
	 * Go forward to the child card we came from (after going back).
	 */
	goForwardToChild(): boolean {
		if (!this.forwardCardState) return false;

		const targetCardId = this.forwardCardState.cardId;
		const targetCamera = this.forwardCardState.camera;

		// Clear forward state (we're going there now)
		this.forwardCardState = null;

		// Save current position for going back again
		if (this.focusedCardId) {
			this.previousCardState = {
				cardId: this.focusedCardId,
				camera: { ...this.camera }
			};
		}

		this.focusedCardId = targetCardId;

		// Restore the saved camera position
		if (typeof window !== 'undefined') {
			this.isAnimating = true;
			window.dispatchEvent(
				new CustomEvent('canvas-restore', {
					detail: { camera: targetCamera }
				})
			);
		}

		return true;
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

	setAnimating(animating: boolean): void {
		this.isAnimating = animating;
	}

	enterEditMode(cardId: string): void {
		this.editingCardId = cardId;
	}

	exitEditMode(): void {
		this.editingCardId = null;
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

	toggleDebugMode(): void {
		this.debugMode = !this.debugMode;
		if (!this.debugMode) {
			// Clear debug state when disabling
			this.debugExploration = [];
			this.debugCurrentFrame = 0;
		}
	}

	setDebugExploration(frames: AStarExplorationFrame[]): void {
		this.debugExploration = frames;
		this.debugCurrentFrame = 0;
	}

	advanceDebugFrame(): boolean {
		if (this.debugCurrentFrame < this.debugExploration.length - 1) {
			this.debugCurrentFrame++;
			return true;
		}
		return false;
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

	reset(): void {
		this.cards = new Map();
		this.connections = [];
		this.storedPaths = new Map();
		this.activeChain = [];
		this.history = { back: [], forward: [] };
		this.focusedCardId = null;

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

		// Calculate dimensions
		const dimensions = this.calculateCardDimensions(note.content);

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

					// Simulate clicking the link - find link position in card
					// Use a position relative to the card
					const linkPosition: Point = {
						x: card.position.x + 50,
						y: card.position.y + 50 + (links.indexOf(linkTarget) * 20)
					};

					this.openNote(linkTarget, cardId, linkPosition);
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

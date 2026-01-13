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

const STORAGE_KEY = 'spatial-reader-state';

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

function loadPersistedState(): PersistedState | null {
	// Disabled for testing
	return null;
	// if (typeof window === 'undefined') return null;
	// try {
	// 	const stored = localStorage.getItem(STORAGE_KEY);
	// 	if (stored) {
	// 		return JSON.parse(stored);
	// 	}
	// } catch {
	// 	// Ignore parse errors
	// }
	// return null;
}

function savePersistedState(state: PersistedState): void {
	// Disabled for testing
	return;
	// if (typeof window === 'undefined') return;
	// try {
	// 	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	// } catch {
	// 	// Ignore storage errors
	// }
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

	async initialize(vault: Vault): Promise<void> {
		this.vault = vault;

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

		// Load persisted state
		const persisted = loadPersistedState();

		if (persisted?.cameraState) {
			this.camera = persisted.cameraState;
		}

		// Try to restore full canvas state
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

	isLinkBroken(target: string): boolean {
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
		const { position } = calculateNewCardPosition(
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
					sourcePoint: linkPosition
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
		return true;
	}

	/**
	 * Focus on a card and smoothly center the view.
	 */
	focusCard(cardId: string): void {
		const card = this.cards.get(cardId);
		if (!card) return;

		this.focusedCardId = cardId;

		// Dispatch event for Canvas to animate
		if (typeof window !== 'undefined') {
			this.isAnimating = true;
			window.dispatchEvent(
				new CustomEvent('canvas-focus', {
					detail: {
						x: card.position.x + card.dimensions.width / 2,
						y: card.position.y + card.dimensions.height / 2,
						cardId: card.id
					}
				})
			);
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

	setAnimating(animating: boolean): void {
		this.isAnimating = animating;
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

		savePersistedState({
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

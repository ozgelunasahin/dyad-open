import type { Card, Connection, Camera, Note, Point, Vault } from '$lib/types';
import { MAX_CARDS } from '$lib/types';
import { calculateNewCardPosition } from '$lib/utils/layout';

const STORAGE_KEY = 'spatial-reader-state';

interface PersistedState {
	lastViewedNoteId: string | null;
	cameraState: Camera;
}

function loadPersistedState(): PersistedState | null {
	if (typeof window === 'undefined') return null;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Ignore parse errors
	}
	return null;
}

function savePersistedState(state: PersistedState): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

class CanvasStore {
	cards = $state<Map<string, Card>>(new Map());
	connections = $state<Connection[]>([]);
	activeChain = $state<string[]>([]);
	camera = $state<Camera>({ x: 0, y: 0, zoom: 1 });

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
		const entryNoteId = persisted?.lastViewedNoteId || vault.entryPoint;

		if (persisted?.cameraState) {
			this.camera = persisted.cameraState;
		}

		// Open the entry note
		const entryNote = vault.notes[entryNoteId] || vault.notes[vault.entryPoint];
		if (entryNote) {
			this.openNote(entryNote.id, null, null);
		}
	}

	isLinkBroken(target: string): boolean {
		return this.brokenLinks.has(target);
	}

	openNote(noteId: string, fromCardId: string | null, linkPosition: Point | null): boolean {
		if (!this.vault) return false;

		const note = this.vault.notes[noteId];
		if (!note) return false;

		// Check if note is already open
		if (this.cards.has(noteId)) {
			// Just update active chain
			this.history.back.push([...this.activeChain]);
			this.history.forward = [];
			this.activeChain = [...this.activeChain, noteId];
			this.persistState();
			return true;
		}

		// Check card limit
		if (this.cards.size >= MAX_CARDS) {
			return false;
		}

		// Get parent card if exists
		const parentCard = fromCardId ? this.cards.get(fromCardId) ?? null : null;
		const existingCards = Array.from(this.cards.values());

		// Calculate position
		const position = calculateNewCardPosition(parentCard, existingCards, linkPosition);

		// Create new card
		const newCard: Card = {
			id: noteId,
			note,
			position,
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

		this.persistState();
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
		this.persistState();
	}

	updateCamera(camera: Camera): void {
		this.camera = camera;
		this.persistState();
	}

	isInActiveChain(cardId: string): boolean {
		return this.activeChain.includes(cardId);
	}

	isConnectionActive(conn: Connection): boolean {
		const fromIndex = this.activeChain.indexOf(conn.fromCardId);
		const toIndex = this.activeChain.indexOf(conn.toCardId);
		return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1;
	}

	private persistState(): void {
		const lastNote = this.activeChain[this.activeChain.length - 1];
		savePersistedState({
			lastViewedNoteId: lastNote || null,
			cameraState: this.camera
		});
	}

	reset(): void {
		this.cards = new Map();
		this.connections = [];
		this.activeChain = [];
		this.history = { back: [], forward: [] };

		if (this.vault) {
			const entry = this.vault.notes[this.vault.entryPoint];
			if (entry) {
				this.openNote(entry.id, null, null);
			}
		}
	}
}

export const canvasStore = new CanvasStore();

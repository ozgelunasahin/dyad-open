<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { select } from 'd3-selection';
	import 'd3-transition'; // Adds .transition() method to selections
	import { CARD_WIDTH } from '$lib/types';
	import type { Point, LinkSide, SourceBounds, CardRestoration } from '$lib/types';
	import { isHTMLElement } from '$lib/utils/type-guards';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import {
		routeConnection,
		pathToSvgWithHops,
		getCardEntryPoint
	} from '$lib/utils/pathfinding';
	import NoteCard from './NoteCard.svelte';
	import ConnectionLine from './ConnectionLine.svelte';
	import CommentCard from './CommentCard.svelte';
	import { sanitizeSlug } from '$lib/utils/slug';

	interface CommentCardData {
		highlightId: string;
		x: number;
		y: number;
		width: number;
		selectedText: string;
		comments: Array<{ id: string; user_id: string; username: string; body: string; created_at: string }>;
		sourceNoteSlug: string;
		highlightSourceX: number; // canvas-coords: right edge of highlight text
		highlightSourceY: number; // canvas-coords: vertical center of highlight text
	}

	interface Props {
		readOnly?: boolean;
		interactive?: boolean;
		captureWheel?: boolean;
		onBoundaryExit?: (direction: 'up' | 'down') => void;
		commentMode?: boolean;
		commentCards?: CommentCardData[];
		onAddComment?: (highlightId: string, body: string) => Promise<void>;
		currentUserId?: string;
	}

	let { readOnly = false, interactive = true, captureWheel = true, onBoundaryExit, commentMode = false, commentCards = [], onAddComment, currentUserId }: Props = $props();

	let svg: SVGSVGElement;
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
	let zoomSpeed = 0.001;

	// Animation generation counter (P2-007 fix: prevent memory leaks and racing animations)
	// Each animation increments this; if it changes mid-animation, the old animation stops
	let animationGeneration = 0;

	// Click vs drag detection for non-focused cards
	let dragStartPos: { x: number; y: number } | null = null;
	let dragStartTarget: HTMLElement | null = null;
	const CLICK_THRESHOLD = 5; // pixels - movement below this is a click, above is a drag

	// Pending link restoration to apply after animation completes
	let pendingLinkRestoration: CardRestoration | null = null;

	// Scroll boundary pass-through: track consecutive wheel events at canvas scroll limits
	// After BOUNDARY_HITS_THRESHOLD consecutive boundary hits, let events propagate to parent
	const BOUNDARY_HITS_THRESHOLD = 3;
	let boundaryHits = 0;
	let lastBoundaryDirection: 'up' | 'down' | null = null;

	/**
	 * Compute the zoom level that fits a card within the viewport on narrow screens.
	 * On wide screens (card fits at zoom=1), returns the requested zoom unchanged.
	 * On narrow screens (mobile), returns a reduced zoom so the card fits with margins.
	 */
	function mobileAutoZoom(viewportWidth: number, requestedZoom: number): number {
		const margin = 16;
		const available = viewportWidth - 2 * margin;
		const maxZoomToFit = available / CARD_WIDTH;
		// Only scale down, never up — and only when card would overflow
		if (CARD_WIDTH * requestedZoom > available) {
			return Math.min(requestedZoom, maxZoomToFit);
		}
		return requestedZoom;
	}

	/**
	 * Compute the viewport X offset to place a card's center in the reading zone.
	 * On wide screens: card center at 35% of viewport (left-biased reading).
	 * On narrow screens (mobile): card left edge at a small margin so full width is visible.
	 */
	function readingZoneX(viewportWidth: number, zoomLevel: number): number {
		const cardScreenWidth = CARD_WIDTH * zoomLevel;
		const mobileMargin = 16;

		// Callers do: translateX = rzX - cardCenterX * zoom
		// Card left edge on screen = rzX - cardScreenWidth/2
		// So to place left edge at mobileMargin: rzX = mobileMargin + cardScreenWidth/2

		// Check if centering at 35% would clip the card's left edge
		const centeredLeft = viewportWidth * 0.35 - cardScreenWidth / 2;
		if (centeredLeft < mobileMargin) {
			// Would clip — position card left edge at margin instead
			return mobileMargin + cardScreenWidth / 2;
		}

		return viewportWidth * 0.35;
	}

	onMount(() => {
		zoomBehavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 3])
			// Slow down zoom speed (default is ~0.002, we use 0.0005 for smoother zoom)
			.wheelDelta((event) => {
				return -event.deltaY * zoomSpeed;
			})
			// Only allow zoom on Ctrl+wheel, allow drag panning
			.filter((event) => {
				// Block all d3-zoom events when not interactive (defense-in-depth)
				if (!interactive) return false;
				// For wheel events, only zoom if Ctrl is held
				if (event.type === 'wheel') {
					return event.ctrlKey;
				}
				// For mousedown/touchstart, handle focused vs non-focused cards differently
				if (event.type === 'mousedown' || event.type === 'touchstart') {
					// Clear stale drag state at the start of any mousedown
					dragStartPos = null;
					dragStartTarget = null;

					if (!isHTMLElement(event.target)) return true;
					const foreignObject = event.target.closest('foreignObject');
					if (foreignObject) {
						const noteId = foreignObject.getAttribute('data-note-id');
						// Focused card: don't capture (allow normal clicks)
						if (noteId === canvasStore.focusedCardId) {
							return false;
						}
						// Non-focused card: capture for panning, but track for click detection
						const touch = (event as TouchEvent).touches?.[0];
						dragStartPos = { x: touch?.clientX ?? event.clientX, y: touch?.clientY ?? event.clientY };
						dragStartTarget = event.target;
						return true;
					}
				}
				// Allow drag/pan and other events on canvas background
				return true;
			})
			.on('zoom', (event) => {
				transform = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k
				};
				canvasStore.updateCamera({
					x: event.transform.x,
					y: event.transform.y,
					zoom: event.transform.k
				});

				// Update reading position continuously while user scrolls/pans (not during animations)
				// This ensures clicking a focused card toggles to the actual last reading position
				if (!canvasStore.isAnimating) {
					canvasStore.updateReadingPosition();
				}

				// Clear saved reading position if card has been panned out of the reading zone
				// Vertical scrolling (reading) is fine, but panning the card out of view clears it
				if (svg) {
					canvasStore.clearSavedStateIfNotInReadingZone(svg.clientWidth, svg.clientHeight, 100);
				}

				// In readOnly mode, auto-focus cards as they scroll into the reading zone
				if (readOnly) {
					canvasStore.updateScrollFocus();
				}
			});

		const selection = select(svg);
		selection.call(zoomBehavior);

		// Disable double-click zoom (prevents accidental zoom when clicking on cards)
		selection.on('dblclick.zoom', null);

		// Wrap d3-zoom's wheel handler to stop propagation (prevents scroll-snap from firing)
		const originalZoomWheel = selection.on('wheel.zoom');
		if (originalZoomWheel) {
			selection.on('wheel.zoom', function (this: SVGSVGElement, event: Event) {
				if (!interactive) return;
				event.stopPropagation();
				originalZoomWheel.call(this, event);
			});
		}

		// Handle regular scroll for vertical panning within focused card
		function handleWheel(event: WheelEvent) {
			// Skip all handling when not interactive or wheel capture disabled
			if (!interactive || !captureWheel) return;
			// Skip if Ctrl is held (let d3-zoom handle it for zooming)
			if (event.ctrlKey) return;

			const scrollDirection = event.deltaY > 0 ? 'down' : 'up';

			const focusedCard = canvasStore.focusedCardId
				? canvasStore.cards.get(canvasStore.focusedCardId)
				: null;

			let newY = transform.y - event.deltaY;
			let atBoundary = false;

			if (readOnly) {
				// Clamp to full content bounds
				const bounds = canvasStore.getBoundingBox();
				if (bounds) {
					const viewportHeight = svg.clientHeight;
					const padding = viewportHeight * 0.5;
					const maxY = padding - bounds.minY * transform.k;
					const minY = viewportHeight - padding - bounds.maxY * transform.k;
					const clampedY = Math.max(minY, Math.min(maxY, newY));
					atBoundary = clampedY !== newY;
					newY = clampedY;
				}
			} else if (focusedCard) {
				// Calculate vertical bounds based on focused card
				const viewportHeight = svg.clientHeight;
				const cardTop = focusedCard.position.y;
				const cardBottom = focusedCard.position.y + focusedCard.dimensions.height;

				// Convert to screen coordinates for bounds
				const maxY = viewportHeight / 2 - cardTop * transform.k + 100;
				const minY = viewportHeight / 2 - cardBottom * transform.k - 100;

				const clampedY = Math.max(minY, Math.min(maxY, newY));
				atBoundary = clampedY !== newY;
				newY = clampedY;
			}

			// Track consecutive boundary hits in the same direction
			if (atBoundary && scrollDirection === lastBoundaryDirection) {
				boundaryHits++;
			} else if (atBoundary) {
				// Changed direction at boundary — reset counter
				boundaryHits = 1;
				lastBoundaryDirection = scrollDirection;
			} else {
				// Not at boundary — reset
				boundaryHits = 0;
				lastBoundaryDirection = null;
			}

			// If we've hit the boundary enough times, signal the parent to scroll
			// to the next/previous section
			if (boundaryHits >= BOUNDARY_HITS_THRESHOLD) {
				event.preventDefault();
				event.stopPropagation();
				if (onBoundaryExit && lastBoundaryDirection) {
					onBoundaryExit(lastBoundaryDirection);
				}
				// Reset so we don't fire repeatedly
				boundaryHits = 0;
				lastBoundaryDirection = null;
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
			zoomBehavior.transform(selection, newTransform);
		}

		svg.addEventListener('wheel', handleWheel, { passive: false });

		// Click-vs-drag detection: shared handler for mouseup and touchend
		function handlePointerUp(clientX: number, clientY: number) {
			if (!dragStartPos || !dragStartTarget) {
				return;
			}

			const dx = clientX - dragStartPos.x;
			const dy = clientY - dragStartPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			// Reset state before potentially triggering handlers
			const targetElement = dragStartTarget;
			const wasForeignObject = targetElement.closest('foreignObject');
			dragStartPos = null;
			dragStartTarget = null;

			// If moved more than threshold, it was a drag - d3-zoom handled it
			if (distance > CLICK_THRESHOLD) {
				return;
			}

			// It was a click (not a drag) - trigger the appropriate handler
			if (wasForeignObject) {
				// Check if click was on a wikilink
				const wikilinkEl = targetElement.closest('.wikilink');
				if (wikilinkEl) {
					const target = (wikilinkEl as HTMLElement).dataset.target;
					const noteId = wasForeignObject.getAttribute('data-note-id');
					if (target && noteId) {
						// Trigger wikilink click
						const rect = wikilinkEl.getBoundingClientRect();
						handleLinkClick(target, noteId, {
							left: rect.left,
							right: rect.right,
							bottom: rect.bottom
						});
					}
					return;
				}

				// Click on card content - focus the card
				const noteId = wasForeignObject.getAttribute('data-note-id');
				if (noteId) {
					handleCardClick(noteId);
				}
			}
		}

		function handleMouseUp(event: MouseEvent) {
			handlePointerUp(event.clientX, event.clientY);
		}

		function handleTouchEnd(event: TouchEvent) {
			const touch = event.changedTouches[0];
			if (touch) {
				handlePointerUp(touch.clientX, touch.clientY);
			}
		}

		// Listen on document to catch mouseup/touchend even if pointer moves off the card
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('touchend', handleTouchEnd);

		// Position camera: focused card in reading zone, or restore stored position
		const storedCamera = canvasStore.camera;
		if (canvasStore.focusedCardId) {
			// Position focused card in reading zone on mount
			const card = canvasStore.cards.get(canvasStore.focusedCardId);
			if (card) {
				const width = svg.clientWidth;
				const height = svg.clientHeight;
				const topMargin = height * 0.15;
				const targetX = card.position.x + card.dimensions.width / 2;
				const targetY = card.position.y;
				const baseZoom = storedCamera.zoom !== 1 ? storedCamera.zoom : 1;
				const zoomLevel = readOnly ? mobileAutoZoom(width, baseZoom) : baseZoom;
				const rzX = readingZoneX(width, zoomLevel);
				const initialTransform = zoomIdentity
					.translate(rzX - targetX * zoomLevel, topMargin - targetY * zoomLevel)
					.scale(zoomLevel);
				selection.call(zoomBehavior.transform, initialTransform);
			}
		} else if (storedCamera.x !== 0 || storedCamera.y !== 0 || storedCamera.zoom !== 1) {
			// No focused card, restore stored camera
			const initialTransform = zoomIdentity
				.translate(storedCamera.x, storedCamera.y)
				.scale(storedCamera.zoom);
			selection.call(zoomBehavior.transform, initialTransform);
		} else {
			// Center initial view (no focused card, no stored camera)
			const width = svg.clientWidth;
			const height = svg.clientHeight;
			const initialTransform = zoomIdentity.translate(width / 2, height / 2);
			selection.call(zoomBehavior.transform, initialTransform);
		}

		// Compute paths for any restored connections (after state initialization)
		setTimeout(() => computeMissingPaths(), 0);

		// Set initial viewport dimensions and update on resize
		canvasStore.updateViewportDimensions(svg.clientWidth, svg.clientHeight);
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				canvasStore.updateViewportDimensions(entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeObserver.observe(svg);

		// Listen for focus animation requests
		const handleFocusAnimation = (event: Event) => {
			const customEvent = event as CustomEvent<{
				x: number;
				y: number;
				cardId: string;
				linkRestoration?: CardRestoration | null;
			}>;
			pendingLinkRestoration = customEvent.detail.linkRestoration ?? null;
			animateToCenter(customEvent.detail.x, customEvent.detail.y);
		};

		window.addEventListener('canvas-focus', handleFocusAnimation);

		// Listen for instant focus events (no animation, just restore link state)
		const handleInstantFocus = (event: Event) => {
			const customEvent = event as CustomEvent<{
				cardId: string;
				linkRestoration?: CardRestoration | null;
			}>;
			// Restore link state immediately (no animation to wait for)
			pendingLinkRestoration = customEvent.detail.linkRestoration ?? null;
			restoreLinkFocusAfterAnimation();
		};

		window.addEventListener('canvas-focus-instant', handleInstantFocus);

		// Listen for restore position requests (returning to previous card)
		const handleRestorePosition = (event: Event) => {
			const customEvent = event as CustomEvent<{
				focusY: number;
				cardId: string;
				linkRestoration?: CardRestoration | null;
			}>;
			pendingLinkRestoration = customEvent.detail.linkRestoration ?? null;

			// Compute centered X from the card
			const card = canvasStore.cards.get(customEvent.detail.cardId);
			const focusX = card
				? card.position.x + card.dimensions.width / 2
				: 0;

			animateToFocusPoint({ x: focusX, y: customEvent.detail.focusY });
		};

		window.addEventListener('canvas-restore', handleRestorePosition);

		// Listen for minimal pan requests (gentle nudge to bring card into active area)
		const handleMinimalPan = (event: Event) => {
			const customEvent = event as CustomEvent<{
				cardId: string;
				dx: number;
				dy: number;
				linkRestoration?: CardRestoration | null;
			}>;
			pendingLinkRestoration = customEvent.detail.linkRestoration ?? null;

			// Use the shared animation function for consistent behavior
			animateMinimalPan(customEvent.detail.dx, customEvent.detail.dy);
		};

		window.addEventListener('canvas-minimal-pan', handleMinimalPan);

		// Keyboard shortcuts for canvas navigation
		const handleKeyDown = (event: KeyboardEvent) => {
			// Escape exits edit mode from anywhere
			if (event.key === 'Escape' && canvasStore.editingCardId) {
				event.preventDefault();
				canvasStore.exitEditMode();
				return;
			}

			// Don't trigger other shortcuts if editing or typing in an input
			if (canvasStore.editingCardId) return;
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

			const isMod = event.metaKey || event.ctrlKey;
			const selection = select(svg);

			// === ZOOM SHORTCUTS ===
			if (isMod && (event.key === '+' || event.key === '=')) {
				event.preventDefault();
				const newK = Math.min(3, transform.k * 1.2);
				const newTransform = zoomIdentity.translate(transform.x, transform.y).scale(newK);
				selection.transition().duration(150).call(zoomBehavior.transform, newTransform);
				return;
			}

			if (isMod && event.key === '-') {
				event.preventDefault();
				const newK = Math.max(0.1, transform.k / 1.2);
				const newTransform = zoomIdentity.translate(transform.x, transform.y).scale(newK);
				selection.transition().duration(150).call(zoomBehavior.transform, newTransform);
				return;
			}

			if (isMod && event.key === '0') {
				event.preventDefault();
				const newTransform = zoomIdentity.translate(transform.x, transform.y).scale(1);
				selection.transition().duration(150).call(zoomBehavior.transform, newTransform);
				return;
			}

			// === PAN WITH SHIFT+ARROW ===
			if (event.shiftKey && event.key.startsWith('Arrow')) {
				event.preventDefault();
				const panAmount = 100;
				let dx = 0, dy = 0;

				switch (event.key) {
					case 'ArrowLeft': dx = panAmount; break;
					case 'ArrowRight': dx = -panAmount; break;
					case 'ArrowUp': dy = panAmount; break;
					case 'ArrowDown': dy = -panAmount; break;
				}

				const newTransform = zoomIdentity
					.translate(transform.x + dx, transform.y + dy)
					.scale(transform.k);
				zoomBehavior.transform(selection, newTransform);
				return;
			}

			// === KEYBOARD NAVIGATION (Chain & Link Focus) ===

			// Helper to get visible wikilinks in viewport for CURRENT focused card
			// Uses canvasStore.focusedCardId directly to avoid stale closure after navigation
			const getWikilinks = (): HTMLElement[] => {
				const currentFocusedCard = canvasStore.focusedCardId;
				const cardElement = currentFocusedCard
					? document.querySelector(`[data-note-id="${currentFocusedCard}"]`)
					: null;
				if (!cardElement) return [];

				const allLinks = Array.from(cardElement.querySelectorAll('.wikilink')).filter(isHTMLElement);
				if (!svg) return allLinks;

				// Filter to only links visible in viewport
				const viewportRect = svg.getBoundingClientRect();
				return allLinks.filter(link => {
					const linkRect = link.getBoundingClientRect();
					return (
						linkRect.bottom > viewportRect.top &&
						linkRect.top < viewportRect.bottom &&
						linkRect.right > viewportRect.left &&
						linkRect.left < viewportRect.right
					);
				});
			};

			// Helper to clear all link highlights
			const clearLinkHighlights = () => {
				document.querySelectorAll('.wikilink.link-focused').forEach(el => {
					el.classList.remove('link-focused');
				});
			};

			// Helper to highlight a specific link by index in given links array
			const highlightLink = (links: HTMLElement[], index: number | null) => {
				clearLinkHighlights();
				if (index !== null && index < links.length) {
					links[index]?.classList.add('link-focused');
				}
			};

			// Helper to get the currently highlighted link element from DOM
			// This is the source of truth for which link will be followed
			const getHighlightedLink = (): HTMLElement | null => {
				return document.querySelector('.wikilink.link-focused') as HTMLElement | null;
			};

			// Helper to enter or restore link focus mode with proper state
			const enterOrRestoreLinkFocusMode = (links: HTMLElement[], savedTarget?: string) => {
				if (links.length === 0) return;

				canvasStore.enterLinkFocusMode();

				// Try to restore to saved target if provided
				if (savedTarget) {
					const savedIndex = links.findIndex(link => link.dataset.target === savedTarget);
					if (savedIndex >= 0) {
						canvasStore.focusedLinkIndex = savedIndex;
					}
				}

				highlightLink(links, canvasStore.focusedLinkIndex);
			};

			// Helper to save link state before leaving current card
			const saveLinkStateBeforeLeaving = (linkFocusActive: boolean) => {
				const highlightedLink = getHighlightedLink();
				const linkTarget = highlightedLink?.dataset.target;
				canvasStore.saveLinkState(linkTarget, linkFocusActive);
			};
			// Note: Link restoration after navigation is handled by restoreLinkFocusAfterAnimation()
			// which runs after the camera animation completes

			// Helper to follow the currently highlighted link
			// Uses the DOM highlight as source of truth, not focusedLinkIndex
			const followHighlightedLink = async () => {
				const currentFocusedCard = canvasStore.focusedCardId;
				const highlightedLink = getHighlightedLink();

				if (!highlightedLink || !currentFocusedCard) return;

				const target = highlightedLink.dataset.target;
				if (!target) return;

				const rect = highlightedLink.getBoundingClientRect();
				const svgRect = svg.getBoundingClientRect();
				const canvasBounds: SourceBounds = {
					left: (rect.left - svgRect.left - transform.x) / transform.k,
					right: (rect.right - svgRect.left - transform.x) / transform.k,
					y: (rect.bottom - svgRect.top - transform.y) / transform.k
				};

				// Calculate linkSide based on link center relative to card center
				const linkCenterX = (canvasBounds.left + canvasBounds.right) / 2;
				const fromCard = canvasStore.cards.get(currentFocusedCard);
				const cardCenterX = fromCard
					? fromCard.position.x + (fromCard.dimensions?.width ?? 400) / 2
					: 0;
				const linkSide: LinkSide = linkCenterX < cardCenterX ? 'left' : 'right';

				// Handle broken links: create the note and open in edit mode
				if (canvasStore.isLinkBroken(target)) {
					const safeNoteId = sanitizeSlug(target);
					if (!safeNoteId) return;

					// Create title from slug
					const title = safeNoteId
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ');

					// Create initial content as empty doc
					const content = {
						type: 'doc',
						content: [{ type: 'paragraph' }]
					};

					try {
						const res = await fetch(`/api/notes/${safeNoteId}?canvas_id=${canvasStore.canvasId}`, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ title, content })
						});

						if (!res.ok) {
							console.error('Failed to create note:', safeNoteId);
							return;
						}

						canvasStore.addNoteToVault(safeNoteId, title, content);
						canvasStore.exitLinkFocusMode();
						canvasStore.followLinkToRight(safeNoteId, currentFocusedCard, canvasBounds);

						// Compute and store path for new connection
						if (canvasStore.cards.has(safeNoteId)) {
							computeAndStorePath(currentFocusedCard, safeNoteId, canvasBounds);
						}

						// Enter edit mode after animation completes (400ms)
						// Guard: only enter if card is still focused (user didn't navigate away)
						const targetCardId = safeNoteId;
						setTimeout(() => {
							if (canvasStore.cards.has(targetCardId) && canvasStore.focusedCardId === targetCardId) {
								canvasStore.enterEditMode(targetCardId);
							}
						}, 500);
					} catch (err) {
						console.error('Failed to create note:', err);
					}
					return;
				}

				canvasStore.exitLinkFocusMode();
				const noteAlreadyOpen = canvasStore.cards.has(target);
				canvasStore.followLinkToRight(target, currentFocusedCard, canvasBounds);

				// Compute and store path for new connection if card was created
				if (!noteAlreadyOpen && canvasStore.cards.has(target)) {
					computeAndStorePath(currentFocusedCard, target, canvasBounds);
				}
			};

			// Get current visible links (fresh each keydown)
			const visibleLinks = getWikilinks();
			const linkCount = visibleLinks.length;

			// === LINK FOCUS MODE ===
			if (canvasStore.isLinkFocusMode) {
				if (event.key === 'Escape') {
					event.preventDefault();
					saveLinkStateBeforeLeaving(false); // Explicitly exited, don't restore
					canvasStore.exitLinkFocusMode();
					clearLinkHighlights();
					return;
				}

				// Tab/Shift+Tab: cycle through visible links
				if (event.key === 'Tab' && !event.shiftKey) {
					event.preventDefault();
					canvasStore.focusNextLink(linkCount);
					highlightLink(visibleLinks, canvasStore.focusedLinkIndex);
					return;
				}

				if (event.key === 'Tab' && event.shiftKey) {
					event.preventDefault();
					canvasStore.focusPrevLink(linkCount);
					highlightLink(visibleLinks, canvasStore.focusedLinkIndex);
					return;
				}

				// ArrowRight, Enter, Space: follow the highlighted link
				if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					saveLinkStateBeforeLeaving(true); // Remember we were in link focus
					followHighlightedLink();
					clearLinkHighlights();
					return;
				}

				// ArrowLeft: close linked card if open, else exit link focus mode
				// Priority: 1) Close linked card, 2) Exit link focus, 3) Close current card (in card mode)
				if (event.key === 'ArrowLeft') {
					event.preventDefault();

					// Check if highlighted link points to an open card
					const highlightedLink = getHighlightedLink();
					const linkTarget = highlightedLink?.dataset.target;

					if (linkTarget && canvasStore.cards.has(linkTarget)) {
						// Close the linked card, stay in link focus mode
						canvasStore.unopenCard(linkTarget);
						return;
					}

					// No open linked card - just exit link focus mode (don't close current card yet)
					saveLinkStateBeforeLeaving(false); // Exiting, don't restore on next focus
					canvasStore.exitLinkFocusMode();
					clearLinkHighlights();
					return;
				}

				// Let ArrowUp/Down fall through to vertical panning below
			}

			// === CARD FOCUS MODE ===
			// Always suppress Tab to prevent browser focus shift
			if (event.key === 'Tab') {
				event.preventDefault();
				if (linkCount > 0) {
					const savedState = canvasStore.getSavedCardState();
					enterOrRestoreLinkFocusMode(visibleLinks, savedState?.linkTarget);
				}
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				canvasStore.unopenCurrentCard();
				return;
			}

			// Vertical scrolling with ArrowUp/Down (same behavior as wheel scroll)
			if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey) {
				event.preventDefault();
				const scrollAmount = 80;
				const dy = event.key === 'ArrowUp' ? scrollAmount : -scrollAmount;

				const focusedCard = canvasStore.focusedCardId
					? canvasStore.cards.get(canvasStore.focusedCardId)
					: null;

				let newY = transform.y + dy;

				if (readOnly) {
					// Clamp to full content bounds
					const bounds = canvasStore.getBoundingBox();
					if (bounds) {
						const viewportHeight = svg.clientHeight;
						const padding = 100;
						const maxY = padding - bounds.minY * transform.k;
						const minY = viewportHeight - padding - bounds.maxY * transform.k;
						newY = Math.max(minY, Math.min(maxY, newY));
					}
				} else if (focusedCard) {
					// Calculate vertical bounds based on focused card
					const viewportHeight = svg.clientHeight;
					const cardTop = focusedCard.position.y;
					const cardBottom = focusedCard.position.y + focusedCard.dimensions.height;

					// Convert to screen coordinates for bounds
					const maxY = viewportHeight / 2 - cardTop * transform.k + 100;
					const minY = viewportHeight / 2 - cardBottom * transform.k - 100;

					// Apply bounds
					newY = Math.max(minY, Math.min(maxY, newY));
				}

				const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
				zoomBehavior.transform(selection, newTransform);
				return;
			}

			// Chain navigation (link restoration happens after animation)
			// Ctrl+Left keeps card open, plain Left closes it (Miller Columns pattern)
			if (event.key === 'ArrowLeft' && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				const keepOpen = event.ctrlKey || event.metaKey;
				canvasStore.navigateLeftInChain(keepOpen);
				return;
			}

			if (event.key === 'ArrowRight' && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				canvasStore.navigateRightInChain();
				return;
			}

			// 'e' key to enter edit mode on focused card (not in readOnly)
			if (event.key === 'e' && canvasStore.focusedCardId && !readOnly) {
				event.preventDefault();
				canvasStore.enterEditMode(canvasStore.focusedCardId);
			}

			// 'l' key to toggle connection line visibility
			if (event.key === 'l') {
				event.preventDefault();
				canvasStore.toggleLines();
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		// Listen for zoom-to-fit requests
		const handleZoomToFit = () => {
			zoomToFitAll();
		};
		window.addEventListener('canvas-zoom-to-fit', handleZoomToFit);

		// Listen for card content reflow (during editing) to update connection source bounds
		const handleContentReflow = (event: Event) => {
			const { cardId } = (event as CustomEvent<{ cardId: string }>).detail;
			const childCards = canvasStore.getChildCards(cardId);

			if (childCards.length === 0) return;

			// Get the parent card's DOM element
			const parentCardEl = svg.querySelector(`[data-note-id="${cardId}"]`);
			if (!parentCardEl) return;

			const svgRect = svg.getBoundingClientRect();

			// Update sourceBounds for each child's connection
			for (const child of childCards) {
				// Find the wikilink in the parent that targets this child's note
				const wikilinkEl = parentCardEl.querySelector(
					`.wikilink[data-target="${child.note.id}"]`
				);
				if (!wikilinkEl) continue;

				// Get the wikilink's current screen position
				const linkRect = wikilinkEl.getBoundingClientRect();

				// Convert to canvas coordinates (full bounds: left, right, y)
				const newSourceBounds: SourceBounds = {
					left: (linkRect.left - svgRect.left - transform.x) / transform.k,
					right: (linkRect.right - svgRect.left - transform.x) / transform.k,
					y: (linkRect.bottom - svgRect.top - transform.y) / transform.k
				};

				// Update the connection's sourceBounds
				canvasStore.updateConnectionSourceBounds(cardId, child.id, newSourceBounds);
			}
		};
		window.addEventListener('card-content-reflow', handleContentReflow);

		// Listen for chain-open requests (from navigateToCard for unopened cards)
		const handleOpenChain = (event: Event) => {
			const { path, target } = (event as CustomEvent<{ path: string[]; target: string }>).detail;

			// Open each step in the path by finding the real wikilink DOM element
			for (let i = 1; i < path.length; i++) {
				const noteId = path[i];
				const parentId = path[i - 1];
				if (canvasStore.cards.has(noteId)) continue;

				// Find the wikilink element in the parent card's foreignObject
				const parentFO = svg.querySelector(`foreignObject[data-note-id="${parentId}"]`);
				const wikilinkEl = parentFO?.querySelector(`.wikilink[data-target="${noteId}"]`) as HTMLElement | null;

				if (wikilinkEl) {
					const rect = wikilinkEl.getBoundingClientRect();
					handleLinkClick(noteId, parentId, {
						left: rect.left,
						right: rect.right,
						bottom: rect.bottom
					});
				}
			}

			// Focus the target after all cards are opened
			if (canvasStore.cards.has(target)) {
				canvasStore.focusCard(target, true);
			}
		};
		window.addEventListener('canvas-open-chain', handleOpenChain);

		// Listen for compute-paths requests (for programmatic card creation)
		const handleComputePaths = () => {
			computeMissingPaths();
		};
		window.addEventListener('canvas-compute-paths', handleComputePaths);

		// Listen for connection removal (for wikilink unmarking and same-line path recomputation)
		const handleConnectionRemoved = (event: Event) => {
			const { fromCardId, toCardId, sourceBounds } = (event as CustomEvent<{
				fromCardId: string;
				toCardId: string;
				sourceBounds: SourceBounds;
			}>).detail;
			// Only handle connections where the source card still exists
			if (canvasStore.cards.has(fromCardId)) {
				markWikilinkConnection(fromCardId, toCardId, false);
				// Recompute remaining same-line paths to remove offsets if needed
				recomputeSameLinePathsAfterRemoval(fromCardId, sourceBounds.y);
			}
		};
		window.addEventListener('canvas-connection-removed', handleConnectionRemoved);

		// Compute any missing paths on mount (in case the event was dispatched before we listened)
		// Use a small delay to ensure the DOM is fully settled
		const mountPathsTimer = setTimeout(() => {
			if (canvasStore.connections.length > 0) {
				computeMissingPaths();
			}
		}, 100);

		return () => {
			// P2-007 fix: Cancel any running animations on unmount
			animationGeneration++;
			canvasStore.setAnimating(false);
			clearTimeout(mountPathsTimer);
			// Detach d3-zoom handlers to prevent ghost zoom events on remount
			select(svg).on('.zoom', null);
			window.removeEventListener('canvas-focus', handleFocusAnimation);
			window.removeEventListener('canvas-focus-instant', handleInstantFocus);
			window.removeEventListener('canvas-restore', handleRestorePosition);
			window.removeEventListener('canvas-minimal-pan', handleMinimalPan);
			window.removeEventListener('canvas-zoom-to-fit', handleZoomToFit);
			window.removeEventListener('canvas-open-chain', handleOpenChain);
			window.removeEventListener('canvas-compute-paths', handleComputePaths);
			window.removeEventListener('canvas-connection-removed', handleConnectionRemoved);
			window.removeEventListener('card-content-reflow', handleContentReflow);
			window.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchend', handleTouchEnd);
			svg.removeEventListener('wheel', handleWheel);
			resizeObserver.disconnect();
		};
	});

	/**
	 * Zoom to fit all cards in the viewport with padding.
	 */
	function zoomToFitAll() {
		if (!svg) return;

		const bbox = canvasStore.getBoundingBox();
		if (!bbox) return;

		const padding = 50;
		const contentWidth = bbox.maxX - bbox.minX + padding * 2;
		const contentHeight = bbox.maxY - bbox.minY + padding * 2;

		const viewportWidth = svg.clientWidth;
		const viewportHeight = svg.clientHeight;

		// Calculate zoom to fit
		const scaleX = viewportWidth / contentWidth;
		const scaleY = viewportHeight / contentHeight;
		const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 1x

		// Calculate center of content
		const contentCenterX = (bbox.minX + bbox.maxX) / 2;
		const contentCenterY = (bbox.minY + bbox.maxY) / 2;

		// Calculate translation to center content
		const newX = viewportWidth / 2 - contentCenterX * newScale;
		const newY = viewportHeight / 2 - contentCenterY * newScale;

		// Apply transform
		const selection = select(svg);
		const newTransform = zoomIdentity.translate(newX, newY).scale(newScale);
		selection.transition().duration(500).call(zoomBehavior.transform, newTransform);
	}

	/**
	 * Restore card state (edit mode and/or link focus) after animation completes.
	 * Uses ALL links in the card (not filtered by visibility) to find the target.
	 */
	function restoreLinkFocusAfterAnimation() {
		if (!pendingLinkRestoration) {
			return;
		}

		const { linkTarget, linkFocusActive, wasEditing } = pendingLinkRestoration;
		pendingLinkRestoration = null;

		const currentFocusedCard = canvasStore.focusedCardId;
		if (!currentFocusedCard) return;

		// Restore edit mode if we were editing
		if (wasEditing) {
			canvasStore.enterEditMode(currentFocusedCard);
			return; // Edit mode takes precedence - don't also enter link focus
		}

		// Restore link focus mode if active
		if (!linkFocusActive) return;

		// Wait for DOM to settle after state changes before querying
		requestAnimationFrame(() => {
			// Get ALL links in the focused card (not filtered by visibility)
			// CSS.escape for defense-in-depth (IDs are already sanitized)
			const cardElement = document.querySelector(`[data-note-id="${CSS.escape(currentFocusedCard)}"]`);
			if (!cardElement) return;

			const allLinks = Array.from(cardElement.querySelectorAll('.wikilink')).filter(isHTMLElement);
			if (allLinks.length === 0) return;

			// Enter link focus mode
			canvasStore.enterLinkFocusMode();

			// Find the link with matching target
			if (linkTarget) {
				const targetIndex = allLinks.findIndex(link => link.dataset.target === linkTarget);
				if (targetIndex >= 0) {
					canvasStore.focusedLinkIndex = targetIndex;
				}
			}

			// Clear highlights within this card (scoped query for performance)
			cardElement.querySelectorAll('.wikilink.link-focused').forEach(el => {
				el.classList.remove('link-focused');
			});

			const focusedIndex = canvasStore.focusedLinkIndex;
			if (focusedIndex !== null && focusedIndex < allLinks.length) {
				allLinks[focusedIndex]?.classList.add('link-focused');
			}
		});
	}

	/**
	 * Smoothly animate the view to position for reading.
	 * Card top is placed near the top of viewport, horizontally centered.
	 * Zoom level is always preserved - user controls their reading zoom.
	 * P2-007 fix: Added cancellation check to prevent memory leaks.
	 */
	function animateToCenter(targetX: number, targetY: number) {
		if (!svg) return;

		// Increment generation to cancel any running animation
		const myGeneration = ++animationGeneration;

		const selection = select(svg);
		const width = svg.clientWidth;
		const height = svg.clientHeight;

		// Capture zoom at start to prevent race conditions if zoom changes mid-animation
		// On narrow screens in readOnly mode, scale down so cards fit the viewport
		const zoomLevel = readOnly ? mobileAutoZoom(width, transform.k) : transform.k;

		// Reading view: place card in left-biased reading zone, top near viewport top
		// On mobile, aligns card left edge to viewport for readability
		const topMargin = height * 0.15;
		const rzX = readingZoneX(width, zoomLevel);
		const endX = rzX - targetX * zoomLevel;
		const endY = topMargin - targetY * zoomLevel;

		const startX = transform.x;
		const startY = transform.y;

		const duration = 600;
		const startTime = Date.now();

		function animate() {
			// Check if a newer animation has started
			if (animationGeneration !== myGeneration) return;

			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out quad
			const eased = 1 - (1 - progress) * (1 - progress);

			const currentX = startX + (endX - startX) * eased;
			const currentY = startY + (endY - startY) * eased;

			const newTransform = zoomIdentity.translate(currentX, currentY).scale(zoomLevel);

			selection.call(zoomBehavior.transform, newTransform);

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				canvasStore.setAnimating(false);
				restoreLinkFocusAfterAnimation();
			}
		}

		requestAnimationFrame(animate);
	}

	/**
	 * Smoothly animate to show a focus point at viewport center.
	 * ALWAYS preserves current zoom level - user controls their reading zoom.
	 * P2-007 fix: Added cancellation check to prevent memory leaks.
	 */
	function animateToFocusPoint(focusPoint: { x: number; y: number }) {
		if (!svg) return;

		// Increment generation to cancel any running animation
		const myGeneration = ++animationGeneration;

		const selection = select(svg);

		const width = svg.clientWidth;
		const height = svg.clientHeight;

		// Capture zoom at start to prevent race conditions if zoom changes mid-animation
		// On narrow screens in readOnly mode, scale down so cards fit the viewport
		const zoomLevel = readOnly ? mobileAutoZoom(width, transform.k) : transform.k;

		// Compute target camera position to show focusPoint in reading zone
		const rzX = readingZoneX(width, zoomLevel);
		const targetX = rzX - focusPoint.x * zoomLevel;
		const targetY = height / 2 - focusPoint.y * zoomLevel;

		const startX = transform.x;
		const startY = transform.y;

		const duration = 500;
		const startTime = Date.now();

		function animate() {
			// Check if a newer animation has started
			if (animationGeneration !== myGeneration) return;

			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out quad
			const eased = 1 - (1 - progress) * (1 - progress);

			const currentX = startX + (targetX - startX) * eased;
			const currentY = startY + (targetY - startY) * eased;

			// Keep current zoom constant
			const newTransform = zoomIdentity.translate(currentX, currentY).scale(zoomLevel);

			selection.call(zoomBehavior.transform, newTransform);

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				canvasStore.setAnimating(false);
				restoreLinkFocusAfterAnimation();
			}
		}

		requestAnimationFrame(animate);
	}

	/**
	 * Animate a minimal pan (gentle nudge) to bring content into active area.
	 * Uses same pattern as other animations for consistency.
	 * Captures zoom level at start to prevent interpolation issues.
	 */
	function animateMinimalPan(dx: number, dy: number) {
		if (!svg) return;

		// Increment generation to cancel any running animation
		const myGeneration = ++animationGeneration;

		const selection = select(svg);

		// Capture all values at start to prevent race conditions
		const startX = transform.x;
		const startY = transform.y;
		const zoomLevel = transform.k;

		const targetX = startX + dx;
		const targetY = startY + dy;

		const duration = 450;
		const startTime = Date.now();

		function animate() {
			// Check if a newer animation has started
			if (animationGeneration !== myGeneration) return;

			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out cubic for smooth deceleration
			const eased = 1 - Math.pow(1 - progress, 3);

			const currentX = startX + (targetX - startX) * eased;
			const currentY = startY + (targetY - startY) * eased;

			// Keep zoom constant throughout animation
			const newTransform = zoomIdentity.translate(currentX, currentY).scale(zoomLevel);

			selection.call(zoomBehavior.transform, newTransform);

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				canvasStore.setAnimating(false);
				restoreLinkFocusAfterAnimation();
			}
		}

		requestAnimationFrame(animate);
	}

	/**
	 * Compute and store a path for a new connection.
	 * Uses simple geometric routing (L-shape, Z-shape, around) without A*.
	 * @param sourceBounds - Link underline bounds (left, right, y) for determining start point
	 * @param routingX - Optional pre-assigned routing channel X from layout
	 * @param skipSameLineRecompute - If true, skip recomputing other same-line paths (to avoid recursion)
	 */
	function computeAndStorePath(fromCardId: string, toCardId: string, sourceBounds: SourceBounds, routingX?: number, skipSameLineRecompute?: boolean): void {
		const fromCard = canvasStore.cards.get(fromCardId);
		const toCard = canvasStore.cards.get(toCardId);

		if (!fromCard || !toCard) {
			console.error('[Pathfinding] Missing cards for connection', { fromCardId, toCardId });
			return;
		}

		// Determine exit direction based on actual target card position
		const sourceCenterX = fromCard.position.x + fromCard.dimensions.width / 2;
		const targetCenterX = toCard.position.x + toCard.dimensions.width / 2;
		const exitRight = targetCenterX > sourceCenterX;

		// Calculate vertical offset for multiple links on the same line.
		// Only apply offset when there's already another connection from the same text line.
		// Links further right get placed below links further left (max 4px spacing between lines).
		const LINE_Y_TOLERANCE = 5; // Links within 5px Y are considered "same line"
		const LINE_SPACING = 4; // Vertical spacing between connection lines

		// Find existing connections from the same source card on the same line
		const sameLine = canvasStore.connections.filter(conn => {
			if (conn.fromCardId !== fromCardId) return false;
			if (conn.toCardId === toCardId) return false; // Don't count ourselves
			return Math.abs(conn.sourceBounds.y - sourceBounds.y) < LINE_Y_TOLERANCE;
		});

		let verticalOffset = 0;
		if (sameLine.length > 0) {
			// There are other links open on this line - calculate offset
			const linkCenterX = (sourceBounds.left + sourceBounds.right) / 2;

			// Count how many existing connections are from links further LEFT than us
			// Those lines appear above ours, so we offset down by that count
			const linksToLeft = sameLine.filter(conn => {
				const connCenterX = (conn.sourceBounds.left + conn.sourceBounds.right) / 2;
				return connCenterX < linkCenterX;
			});

			verticalOffset = linksToLeft.length * LINE_SPACING;
		}

		// Always start from LEFT edge of link underline for cleaner visual
		const startPoint: Point = {
			x: sourceBounds.left,
			y: sourceBounds.y + verticalOffset
		};

		// Get all cards as array for obstacle checking
		const allCards = canvasStore.cardList;

		// Get existing paths for crossing detection
		const existingPaths = canvasStore.getExistingPathPoints();

		// Calculate end point
		const endPoint = getCardEntryPoint(toCard, startPoint);

		// Route the connection with optional pre-assigned routing channel
		const result = routeConnection(
			startPoint,
			endPoint,
			allCards,
			fromCard,
			toCard,
			existingPaths,
			routingX
		);

		// Generate SVG path with hops where it crosses existing paths
		const connectionId = `${fromCardId}-${toCardId}`;
		const svgPath = pathToSvgWithHops(result.path, existingPaths);

		// Store the computed path (frozen forever)
		canvasStore.storePath(fromCardId, toCardId, {
			points: result.path,
			svgPath,
			method: result.method,
			failed: result.failed
		});

		// P2-016 fix: Gate debug logging behind debugMode
		if (canvasStore.debugMode) {
			console.log(
				`[Pathfinding] ${connectionId}: ${result.method}`,
				result.path.length, 'points',
				result.failed ? '(FAILED)' : ''
			);
		}

		// Mark the wikilink as having an active connection (hides underline)
		markWikilinkConnection(fromCardId, toCardId, true);

		// Recompute other same-line paths to ensure correct offset ordering
		// (e.g., if right-hand link was opened first, then left-hand link)
		if (!skipSameLineRecompute) {
			recomputeSameLinePaths(fromCardId, sourceBounds.y, toCardId);
		}
	}

	/**
	 * Mark or unmark a wikilink as having an active connection.
	 * When marked, the underline is hidden (replaced by the connection line).
	 */
	function markWikilinkConnection(fromCardId: string, toCardId: string, hasConnection: boolean): void {
		const cardElement = svg?.querySelector(`[data-note-id="${CSS.escape(fromCardId)}"]`);
		if (!cardElement) return;

		const wikilinkEl = cardElement.querySelector(`.wikilink[data-target="${CSS.escape(toCardId)}"]`);
		if (wikilinkEl) {
			if (hasConnection) {
				wikilinkEl.classList.add('has-connection');
			} else {
				wikilinkEl.classList.remove('has-connection');
			}
		}
	}

	/**
	 * Recompute paths for all connections on the same line as the given connection.
	 * Called when a new connection is added to ensure proper offset ordering.
	 * Also nudges target cards to match new line offsets for smooth visual alignment.
	 * @param excludeToCardId - Skip recomputing this connection (it was just computed)
	 */
	function recomputeSameLinePaths(fromCardId: string, sourceBoundsY: number, excludeToCardId?: string): void {
		const LINE_Y_TOLERANCE = 5;
		const LINE_SPACING = 4;

		// Find all connections from the same card on the same line (excluding the one just computed)
		const sameLineConns = canvasStore.connections.filter(conn => {
			if (conn.fromCardId !== fromCardId) return false;
			if (excludeToCardId && conn.toCardId === excludeToCardId) return false;
			return Math.abs(conn.sourceBounds.y - sourceBoundsY) < LINE_Y_TOLERANCE;
		});

		// If no other connections on this line, nothing to recompute
		if (sameLineConns.length === 0) return;

		// Sort by horizontal position (left to right)
		sameLineConns.sort((a, b) => {
			const aCenterX = (a.sourceBounds.left + a.sourceBounds.right) / 2;
			const bCenterX = (b.sourceBounds.left + b.sourceBounds.right) / 2;
			return aCenterX - bCenterX;
		});

		// Calculate new offsets and nudge target cards before recomputing paths
		// Total connections on this line (including the excluded one we just computed)
		const totalConns = excludeToCardId ? sameLineConns.length + 1 : sameLineConns.length;

		for (const conn of sameLineConns) {
			const oldPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!oldPath || oldPath.points.length === 0) continue;

			// Calculate what the new offset should be
			const linkCenterX = (conn.sourceBounds.left + conn.sourceBounds.right) / 2;

			// Count all connections to the left of this one (including excluded)
			let linksToLeft = 0;
			for (const other of sameLineConns) {
				const otherCenterX = (other.sourceBounds.left + other.sourceBounds.right) / 2;
				if (otherCenterX < linkCenterX) linksToLeft++;
			}
			// Also check the excluded connection
			if (excludeToCardId) {
				const excludedConn = canvasStore.connections.find(c =>
					c.fromCardId === fromCardId && c.toCardId === excludeToCardId
				);
				if (excludedConn) {
					const excludedCenterX = (excludedConn.sourceBounds.left + excludedConn.sourceBounds.right) / 2;
					if (excludedCenterX < linkCenterX) linksToLeft++;
				}
			}

			const newOffset = linksToLeft * LINE_SPACING;
			const oldStartY = oldPath.points[0].y;
			const baseY = conn.sourceBounds.y;
			const oldOffset = oldStartY - baseY;
			const deltaY = newOffset - oldOffset;

			// Nudge target card by the offset difference
			if (deltaY !== 0) {
				canvasStore.nudgeCardY(conn.toCardId, deltaY);
			}
		}

		// Now recompute paths with updated card positions
		for (const conn of sameLineConns) {
			canvasStore.clearPath(conn.fromCardId, conn.toCardId);
			computeAndStorePath(conn.fromCardId, conn.toCardId, conn.sourceBounds, conn.routingX, true);
		}
	}

	/**
	 * Recompute same-line paths after a connection is removed.
	 * Nudges target cards to match new offsets and recomputes paths.
	 */
	function recomputeSameLinePathsAfterRemoval(fromCardId: string, sourceBoundsY: number): void {
		const LINE_Y_TOLERANCE = 5;
		const LINE_SPACING = 4;

		// Find remaining connections on the same line
		const remaining = canvasStore.connections.filter(conn => {
			if (conn.fromCardId !== fromCardId) return false;
			return Math.abs(conn.sourceBounds.y - sourceBoundsY) < LINE_Y_TOLERANCE;
		});

		if (remaining.length === 0) return;

		// Sort by horizontal position
		remaining.sort((a, b) => {
			const aCenterX = (a.sourceBounds.left + a.sourceBounds.right) / 2;
			const bCenterX = (b.sourceBounds.left + b.sourceBounds.right) / 2;
			return aCenterX - bCenterX;
		});

		// Calculate new offsets and nudge target cards
		for (let i = 0; i < remaining.length; i++) {
			const conn = remaining[i];
			const oldPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!oldPath || oldPath.points.length === 0) continue;

			// New offset is simply the index (leftmost = 0, second = 1, etc.)
			// But only apply offset if there are multiple connections
			const newOffset = remaining.length > 1 ? i * LINE_SPACING : 0;
			const oldStartY = oldPath.points[0].y;
			const baseY = conn.sourceBounds.y;
			const oldOffset = oldStartY - baseY;
			const deltaY = newOffset - oldOffset;

			if (deltaY !== 0) {
				canvasStore.nudgeCardY(conn.toCardId, deltaY);
			}
		}

		// Recompute paths with updated card positions
		for (const conn of remaining) {
			canvasStore.clearPath(conn.fromCardId, conn.toCardId);
			computeAndStorePath(conn.fromCardId, conn.toCardId, conn.sourceBounds, conn.routingX, true);
		}
	}

	function handleCanvasClick(event: MouseEvent) {
		// Exit edit mode if clicking outside card content
		if (canvasStore.editingCardId) {
			const target = event.target as Element | null;
			if (!target?.closest) return;
			const inForeignObject = target.closest('foreignObject') !== null;
			if (!inForeignObject) {
				// Dispatch event so NoteCard can handle save before exiting
				window.dispatchEvent(new CustomEvent('request-exit-edit-mode'));
			}
		}
	}

	/**
	 * Handle clicking on a card.
	 * First click: focus (highlight) the card without panning
	 * Second click: pan to reading position
	 */
	function handleCardClick(cardId: string) {
		if (canvasStore.focusedCardId === cardId) {
			// Second click on already-focused card - pan to reading position
			canvasStore.panToFocusedCard();
		} else {
			// First click - just focus without panning
			canvasStore.focusCardWithoutAnimation(cardId);
		}
	}

	interface ScreenLinkBounds {
		left: number;
		right: number;
		bottom: number;
	}

	function handleLinkClick(noteId: string, fromCardId: string, screenBounds: ScreenLinkBounds) {
		// TODO: Clicking a link on an unfocused card should focus that card first
		// Currently focusCardWithoutAnimation doesn't visually update the focus state
		if (canvasStore.focusedCardId !== fromCardId) {
			canvasStore.focusCardWithoutAnimation(fromCardId);
		}

		// Check if this note is already open as a direct child of the clicked card
		const existingCard = canvasStore.cards.get(noteId);
		if (existingCard && existingCard.parentId === fromCardId) {
			if (readOnly) {
				// In readOnly mode, focus the existing child card instead of closing it
				canvasStore.navigateToCard(noteId);
				return;
			}
			// Toggle behavior: close the child card
			canvasStore.unopenCard(noteId);
			return;
		}

		// Convert screen bounds to canvas coordinates
		const svgRect = svg.getBoundingClientRect();
		const canvasBounds: SourceBounds = {
			left: (screenBounds.left - svgRect.left - transform.x) / transform.k,
			right: (screenBounds.right - svgRect.left - transform.x) / transform.k,
			y: (screenBounds.bottom - svgRect.top - transform.y) / transform.k
		};

		// Calculate linkSide based on link center relative to card center
		const linkCenterX = (canvasBounds.left + canvasBounds.right) / 2;
		const fromCard = canvasStore.cards.get(fromCardId);
		const cardCenterX = fromCard
			? fromCard.position.x + (fromCard.dimensions?.width ?? 400) / 2
			: 0;
		const linkSide: LinkSide = linkCenterX < cardCenterX ? 'left' : 'right';

		// Save current card's state before navigating (for restoration when coming back)
		// Only restore link highlight if user was already in link focus mode (keyboard nav)
		const wasInLinkFocusMode = canvasStore.isLinkFocusMode;
		canvasStore.saveLinkState(wasInLinkFocusMode ? noteId : undefined, wasInLinkFocusMode);

		// Clear any link highlights
		document.querySelectorAll('.wikilink.link-focused').forEach(el => {
			el.classList.remove('link-focused');
		});

		// Exit link focus mode if active
		if (wasInLinkFocusMode) {
			canvasStore.exitLinkFocusMode();
		}

		// Check if note is already open (will just refocus)
		const noteAlreadyOpen = canvasStore.cards.has(noteId);

		// Use followLinkToRight for consistent chain behavior with keyboard nav
		canvasStore.followLinkToRight(noteId, fromCardId, canvasBounds);

		// Compute and store path for new connection
		if (!noteAlreadyOpen && canvasStore.cards.has(noteId)) {
			computeAndStorePath(fromCardId, noteId, canvasBounds);
		}
	}

	/**
	 * Compute paths for all connections that don't have stored paths yet.
	 * Used when cards are opened programmatically (e.g., openAllLinks).
	 */
	function computeMissingPaths(): void {
		for (const conn of canvasStore.connections) {
			const existingPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!existingPath) {
				computeAndStorePath(conn.fromCardId, conn.toCardId, conn.sourceBounds, conn.routingX);
			} else {
				// Mark wikilink for connections with existing (restored) paths
				markWikilinkConnection(conn.fromCardId, conn.toCardId, true);
			}
		}

		// After all paths are computed, regenerate SVGs so every path sees all others for crossings
		regenerateAllPathSvgs();
	}

	/**
	 * Regenerate SVG paths for all stored connections.
	 * This ensures every path has hops where it crosses ANY other path,
	 * not just paths that existed when it was first computed.
	 *
	 * Convention: Only the "newer" path (lexicographically greater connection key) gets hops.
	 * This prevents both lines from having hops at the same intersection.
	 */
	function regenerateAllPathSvgs(): void {
		// Build a sorted list of connections with their path points
		const connectionsWithPaths: Array<{
			key: string;
			conn: typeof canvasStore.connections[0];
			points: Point[];
		}> = [];

		for (const conn of canvasStore.connections) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (storedPath) {
				connectionsWithPaths.push({
					key: `${conn.fromCardId}-${conn.toCardId}`,
					conn,
					points: storedPath.points
				});
			}
		}

		// Sort by key so we have consistent ordering
		connectionsWithPaths.sort((a, b) => a.key.localeCompare(b.key));

		// Regenerate SVG for each path, only hopping over paths with LOWER keys
		// Build olderPaths incrementally to avoid O(n²) allocations from slice().map()
		const olderPaths: Point[][] = [];

		for (const { conn, points } of connectionsWithPaths) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!storedPath) continue;

			// Regenerate SVG with hops only for older paths (already accumulated)
			const newSvgPath = pathToSvgWithHops(points, olderPaths);

			// Update the stored path with new SVG
			canvasStore.storePath(conn.fromCardId, conn.toCardId, {
				...storedPath,
				svgPath: newSvgPath
			});

			// Add this path to olderPaths for subsequent iterations
			olderPaths.push(points);
		}
	}


	// Pen-and-paper approach: paths are stored when connections are created
	// This derived just reads from stored paths
	let connectionPaths = $derived.by(() => {
		const results: Array<{
			fromCardId: string;
			toCardId: string;
			sourceBounds: SourceBounds;
			path: string;
			pathFailed: boolean;
			method?: string;
		}> = [];

		for (const conn of canvasStore.connections) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);

			if (storedPath) {
				results.push({
					...conn,
					path: storedPath.svgPath,
					pathFailed: storedPath.failed,
					method: storedPath.method
				});
			} else {
				// No stored path yet (shouldn't happen in normal flow)
				results.push({
					...conn,
					path: '',
					pathFailed: true,
					method: 'none'
				});
			}
		}

		return results;
	});
</script>

<svg bind:this={svg} class="canvas" class:debug-active={canvasStore.debugMode} onclick={handleCanvasClick}>
	<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
		<!-- Debug grid overlay - show card obstacle zones and path obstacle corridors -->
		{#if canvasStore.debugMode}
			<g class="debug-grid">
				<!-- Card obstacle zones (20px padding around cards) -->
				{#each canvasStore.cardList as card (card.id)}
					<rect
						x={card.position.x - 20}
						y={card.position.y - 20}
						width={card.dimensions.width + 40}
						height={card.dimensions.height + 40}
						class="cell-obstacle"
					/>
				{/each}
				<!-- Path obstacle corridors (3-cell padding = ~30px on each side) -->
				{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId + '-obstacle')}
					{#if conn.path}
						<path
							d={conn.path}
							class="path-obstacle"
						/>
					{/if}
				{/each}
			</g>
		{/if}

		<!-- Connection lines (toggle with 'l' key) -->
		{#if canvasStore.showLines}
			{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId)}
				<ConnectionLine path={conn.path} pathFailed={conn.pathFailed} />
			{/each}
		{/if}

		<!-- Debug: Show routing method labels -->
		{#if canvasStore.debugMode}
			{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId + '-debug')}
				{#if conn.method}
					{@const fromCard = canvasStore.cards.get(conn.fromCardId)}
					{#if fromCard}
						<g class="debug-method-label" transform="translate({conn.sourceBounds.right + 15}, {conn.sourceBounds.y - 5})">
							<rect
								x="-2"
								y="-10"
								width={conn.method.length * 6 + 4}
								height="14"
								fill={conn.method === 'L-shape' ? '#22c55e' :
									  conn.method === 'Z-shape' ? '#3b82f6' :
									  conn.method === 'around' ? '#f97316' : '#ef4444'}
								fill-opacity="0.8"
								rx="2"
							/>
							<text
								x="0"
								y="0"
								fill="white"
								font-size="9"
								font-family="monospace"
							>{conn.method}</text>
						</g>
					{/if}
				{/if}
			{/each}
		{/if}

		<!-- Note cards (always visible) -->
		{#each canvasStore.cardList as card (card.id)}
			<NoteCard {card} isActive={canvasStore.focusedCardId === card.id} onLinkClick={handleLinkClick} onCardClick={handleCardClick} {readOnly} />
		{/each}

		<!-- Comment cards emerging from highlighted text (visible in comment mode) -->
		{#if commentMode && commentCards.length > 0}
			{#each commentCards as cc (cc.highlightId)}
				{@const sourceCard = canvasStore.cards.get(cc.sourceNoteSlug)}
				{@const virtualCard = { id: `__comment:${cc.highlightId}`, note: { id: `__comment:${cc.highlightId}`, title: '', content: {}, canvasId: '' }, position: { x: cc.x, y: cc.y }, dimensions: { width: cc.width, height: 80 }, parentId: null, sourceLink: null } as import('$lib/types').Card}
				{@const startPoint = { x: cc.highlightSourceX, y: cc.highlightSourceY }}
				{@const endPoint = getCardEntryPoint(virtualCard, startPoint)}
				{@const allCards = canvasStore.cardList}
				{@const existingPaths = canvasStore.getExistingPathPoints()}
				{@const result = routeConnection(startPoint, endPoint, allCards, sourceCard ?? null, virtualCard, existingPaths)}
				{@const svgPath = pathToSvgWithHops(result.path, existingPaths)}
				<ConnectionLine path={svgPath} pathFailed={result.failed} />
				<CommentCard
					x={cc.x}
					y={cc.y}
					width={cc.width}
					selectedText={cc.selectedText}
					comments={cc.comments}
					{currentUserId}
					{onAddComment}
					highlightId={cc.highlightId}
				/>
			{/each}
		{/if}
	</g>
</svg>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		background: var(--bg-canvas);
		cursor: grab;
		transition: background 0.3s ease;
		touch-action: none;
	}

	.canvas:active {
		cursor: grabbing;
	}

	.canvas.debug-active {
		background:
			linear-gradient(90deg, rgba(74, 222, 128, 0.03) 1px, transparent 1px),
			linear-gradient(rgba(74, 222, 128, 0.03) 1px, transparent 1px),
			var(--bg-canvas);
		background-size: 20px 20px, 20px 20px, 100% 100%;
	}

	/* Debug visualization styles */
	.debug-grid .cell-obstacle {
		fill: #ef4444;
		fill-opacity: 0.3;
		stroke: #ef4444;
		stroke-opacity: 0.4;
		stroke-width: 0.5;
	}

	.debug-grid .path-obstacle {
		fill: none;
		stroke: #f97316;
		stroke-opacity: 0.4;
		stroke-width: 20;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

</style>

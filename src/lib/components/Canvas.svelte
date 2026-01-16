<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { select } from 'd3-selection';
	import 'd3-transition'; // Adds .transition() method to selections
	import type { Point, LinkSide, SourceBounds } from '$lib/types';
	import { isHTMLElement } from '$lib/utils/type-guards';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import {
		routeConnection,
		pathToSvgWithHops,
		getCardEntryPoint
	} from '$lib/utils/pathfinding';
	import NoteCard from './NoteCard.svelte';
	import ConnectionLine from './ConnectionLine.svelte';

	interface Props {
		readOnly?: boolean;
	}

	let { readOnly = false }: Props = $props();

	let svg: SVGSVGElement;
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
	let zoomSpeed = 0.001;

	// Animation cancellation flag (P2-007 fix: prevent memory leaks)
	let animationCancelled = false;

	// Pending link restoration to apply after animation completes
	let pendingLinkRestoration: { linkTarget?: string; linkFocusActive: boolean } | null = null;

	onMount(() => {
		zoomBehavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 3])
			// Slow down zoom speed (default is ~0.002, we use 0.0005 for smoother zoom)
			.wheelDelta((event) => {
				return -event.deltaY * zoomSpeed;
			})
			// Only allow zoom on Ctrl+wheel, allow drag panning on canvas background only
			.filter((event) => {
				// Don't capture events when editing (let text selection work)
				if (canvasStore.editingCardId) {
					if (!isHTMLElement(event.target)) return true;
					const inForeignObject = event.target.closest('foreignObject') !== null;
					if (inForeignObject && (event.type === 'mousedown' || event.type === 'touchstart')) {
						return false;
					}
				}
				// For wheel events, only zoom if Ctrl is held
				if (event.type === 'wheel') {
					return event.ctrlKey;
				}
				// Allow drag/pan and other events
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

				// Clear saved reading position if card has been panned out of the reading zone
				// Vertical scrolling (reading) is fine, but panning the card out of view clears it
				if (svg) {
					canvasStore.clearSavedStateIfNotInReadingZone(svg.clientWidth, svg.clientHeight, 100);
				}
			});

		const selection = select(svg);
		selection.call(zoomBehavior);

		// Handle regular scroll for vertical panning within focused card
		function handleWheel(event: WheelEvent) {
			// Skip if Ctrl is held (let d3-zoom handle it for zooming)
			if (event.ctrlKey) return;

			event.preventDefault();

			const focusedCard = canvasStore.focusedCardId
				? canvasStore.cards.get(canvasStore.focusedCardId)
				: null;

			if (!focusedCard) {
				// No focused card - just pan freely
				const newY = transform.y - event.deltaY;
				const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
				selection.call(zoomBehavior.transform, newTransform);
				return;
			}

			// Calculate vertical bounds based on focused card
			const viewportHeight = svg.clientHeight;
			const cardTop = focusedCard.position.y;
			const cardBottom = focusedCard.position.y + focusedCard.dimensions.height;
			const cardCenterY = (cardTop + cardBottom) / 2;

			// Convert to screen coordinates for bounds
			// When card top is at viewport center: transform.y = viewportHeight/2 - cardTop * transform.k
			// When card bottom is at viewport center: transform.y = viewportHeight/2 - cardBottom * transform.k
			const maxY = viewportHeight / 2 - cardTop * transform.k + 100; // Allow 100px past top
			const minY = viewportHeight / 2 - cardBottom * transform.k - 100; // Allow 100px past bottom

			// Apply scroll with bounds
			let newY = transform.y - event.deltaY;
			newY = Math.max(minY, Math.min(maxY, newY));

			const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
			selection.call(zoomBehavior.transform, newTransform);
		}

		svg.addEventListener('wheel', handleWheel, { passive: false });

		// Restore camera position from store
		const storedCamera = canvasStore.camera;
		if (storedCamera.x !== 0 || storedCamera.y !== 0 || storedCamera.zoom !== 1) {
			const initialTransform = zoomIdentity
				.translate(storedCamera.x, storedCamera.y)
				.scale(storedCamera.zoom);
			selection.call(zoomBehavior.transform, initialTransform);
		} else {
			// Center initial view
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
				linkRestoration?: { linkTarget?: string; linkFocusActive: boolean } | null;
			}>;
			pendingLinkRestoration = customEvent.detail.linkRestoration ?? null;
			animateToCenter(customEvent.detail.x, customEvent.detail.y);
		};

		window.addEventListener('canvas-focus', handleFocusAnimation);

		// Listen for restore position requests (returning to previous card)
		const handleRestorePosition = (event: Event) => {
			const customEvent = event as CustomEvent<{
				focusY: number;
				cardId: string;
				linkRestoration?: { linkTarget?: string; linkFocusActive: boolean } | null;
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

		// Keyboard shortcuts for canvas navigation
		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't trigger if already editing or if typing in an input
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
				selection.call(zoomBehavior.transform, newTransform);
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
			const followHighlightedLink = () => {
				const currentFocusedCard = canvasStore.focusedCardId;
				const highlightedLink = getHighlightedLink();

				if (!highlightedLink || !currentFocusedCard) return;

				const target = highlightedLink.dataset.target;
				if (!target) return;

				// Skip broken links
				if (canvasStore.isLinkBroken(target)) return;

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

				canvasStore.exitLinkFocusMode();
				const noteAlreadyOpen = canvasStore.cards.has(target);
				canvasStore.followLinkToRight(target, currentFocusedCard, canvasBounds, linkSide);

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

				if (event.key === 'Delete') {
					event.preventDefault();
					canvasStore.unopenCurrentCard();
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

				// ArrowLeft: exit link focus, navigate left in chain
				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					saveLinkStateBeforeLeaving(true); // Remember we were in link focus
					canvasStore.exitLinkFocusMode();
					clearLinkHighlights();
					canvasStore.navigateLeftInChain();
					// Link restoration happens after animation in restoreLinkFocusAfterAnimation()
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

			if (event.key === 'Delete') {
				event.preventDefault();
				canvasStore.unopenCurrentCard();
				return;
			}

			// Vertical panning with ArrowUp/Down (works in both modes)
			if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.shiftKey) {
				event.preventDefault();
				const panAmount = 80;
				const dy = event.key === 'ArrowUp' ? panAmount : -panAmount;
				const newTransform = zoomIdentity
					.translate(transform.x, transform.y + dy)
					.scale(transform.k);
				selection.call(zoomBehavior.transform, newTransform);
				return;
			}

			// Chain navigation (link restoration happens after animation)
			if (event.key === 'ArrowLeft' && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				canvasStore.navigateLeftInChain();
				return;
			}

			if (event.key === 'ArrowRight' && !event.altKey && !event.shiftKey) {
				event.preventDefault();
				canvasStore.navigateRightInChain();
				return;
			}

			// 'e' key to enter edit mode on focused card
			if (event.key === 'e' && canvasStore.focusedCardId) {
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

		// Listen for compute-paths requests (for programmatic card creation)
		const handleComputePaths = () => {
			computeMissingPaths();
		};
		window.addEventListener('canvas-compute-paths', handleComputePaths);

		return () => {
			// P2-007 fix: Cancel any running animations on unmount
			animationCancelled = true;
			window.removeEventListener('canvas-focus', handleFocusAnimation);
			window.removeEventListener('canvas-restore', handleRestorePosition);
			window.removeEventListener('canvas-zoom-to-fit', handleZoomToFit);
			window.removeEventListener('canvas-compute-paths', handleComputePaths);
			window.removeEventListener('keydown', handleKeyDown);
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
	 * Restore link focus after animation completes.
	 * Uses ALL links in the card (not filtered by visibility) to find the target.
	 */
	function restoreLinkFocusAfterAnimation() {
		if (!pendingLinkRestoration?.linkFocusActive) {
			pendingLinkRestoration = null;
			return;
		}

		const { linkTarget } = pendingLinkRestoration;
		pendingLinkRestoration = null;

		// Get ALL links in the focused card (not filtered by visibility)
		const currentFocusedCard = canvasStore.focusedCardId;
		const cardElement = currentFocusedCard
			? document.querySelector(`[data-note-id="${currentFocusedCard}"]`)
			: null;
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

		// Clear any existing highlights and highlight the focused link
		document.querySelectorAll('.wikilink.link-focused').forEach(el => {
			el.classList.remove('link-focused');
		});
		const focusedIndex = canvasStore.focusedLinkIndex;
		if (focusedIndex !== null && focusedIndex < allLinks.length) {
			allLinks[focusedIndex]?.classList.add('link-focused');
		}
	}

	/**
	 * Smoothly animate the view to position for reading.
	 * Card top is placed near the top of viewport, horizontally centered.
	 * Zoom level is always preserved - user controls their reading zoom.
	 * P2-007 fix: Added cancellation check to prevent memory leaks.
	 */
	function animateToCenter(targetX: number, targetY: number) {
		if (!svg) return;

		// Reset cancellation flag for new animation
		animationCancelled = false;

		const selection = select(svg);
		const width = svg.clientWidth;
		const height = svg.clientHeight;

		// Reading view: place card top at ~15% from viewport top, horizontally centered
		// Always preserve current zoom level
		const topMargin = height * 0.15;
		const endX = width / 2 - targetX * transform.k;
		const endY = topMargin - targetY * transform.k;

		const startX = transform.x;
		const startY = transform.y;

		const duration = 400;
		const startTime = Date.now();

		function animate() {
			// Check cancellation at start of each frame
			if (animationCancelled) return;

			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out quad
			const eased = 1 - (1 - progress) * (1 - progress);

			const currentX = startX + (endX - startX) * eased;
			const currentY = startY + (endY - startY) * eased;

			const newTransform = zoomIdentity.translate(currentX, currentY).scale(transform.k);

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

		// Reset cancellation flag for new animation
		animationCancelled = false;

		const selection = select(svg);

		const width = svg.clientWidth;
		const height = svg.clientHeight;

		// Compute target camera position to show focusPoint at viewport center
		// Using CURRENT zoom level - never change zoom during navigation
		const targetX = width / 2 - focusPoint.x * transform.k;
		const targetY = height / 2 - focusPoint.y * transform.k;

		const startX = transform.x;
		const startY = transform.y;

		const duration = 300; // Slightly faster for "going back"
		const startTime = Date.now();

		function animate() {
			// Check cancellation at start of each frame
			if (animationCancelled) return;

			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out quad
			const eased = 1 - (1 - progress) * (1 - progress);

			const currentX = startX + (targetX - startX) * eased;
			const currentY = startY + (targetY - startY) * eased;

			// Keep current zoom constant
			const newTransform = zoomIdentity.translate(currentX, currentY).scale(transform.k);

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
	 */
	function computeAndStorePath(fromCardId: string, toCardId: string, sourceBounds: SourceBounds, routingX?: number): void {
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

		// Choose start X based on actual exit direction
		// Right-exiting → start from RIGHT edge of link underline
		// Left-exiting → start from LEFT edge of link underline
		const startPoint: Point = {
			x: exitRight ? sourceBounds.right : sourceBounds.left,
			y: sourceBounds.y
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
	}

	function handleCanvasClick(event: MouseEvent) {
		// Exit edit mode if clicking outside card content
		if (canvasStore.editingCardId) {
			if (!isHTMLElement(event.target)) return;
			const inForeignObject = event.target.closest('foreignObject') !== null;
			if (!inForeignObject) {
				canvasStore.exitEditMode();
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

		// Save current card's reading state before navigating (same as keyboard nav)
		canvasStore.saveLinkState(undefined, false);

		// Clear any link highlights
		document.querySelectorAll('.wikilink.link-focused').forEach(el => {
			el.classList.remove('link-focused');
		});

		// Exit link focus mode if active
		if (canvasStore.isLinkFocusMode) {
			canvasStore.exitLinkFocusMode();
		}

		// Check if note is already open (will just refocus)
		const noteAlreadyOpen = canvasStore.cards.has(noteId);

		// Use followLinkToRight for consistent chain behavior with keyboard nav
		canvasStore.followLinkToRight(noteId, fromCardId, canvasBounds, linkSide);

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
			}
		}

		// After all paths are computed, regenerate SVGs so every path sees all others for crossings
		regenerateAllPathSvgs();
	}

	/**
	 * Regenerate SVG paths for all stored connections.
	 * This ensures every path has hops where it crosses ANY other path,
	 * not just paths that existed when it was first computed.
	 */
	function regenerateAllPathSvgs(): void {
		const allPathPoints = canvasStore.getExistingPathPoints();

		for (const conn of canvasStore.connections) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!storedPath) continue;

			// Get all OTHER paths (exclude self)
			const otherPaths = allPathPoints.filter(p => p !== storedPath.points);

			// Regenerate SVG with hops considering all other paths
			const newSvgPath = pathToSvgWithHops(storedPath.points, otherPaths);

			// Update the stored path with new SVG
			canvasStore.storePath(conn.fromCardId, conn.toCardId, {
				...storedPath,
				svgPath: newSvgPath
			});
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

		<!-- Note cards -->
		{#each canvasStore.cardList as card (card.id)}
			<NoteCard {card} isActive={canvasStore.focusedCardId === card.id} onLinkClick={handleLinkClick} onCardClick={handleCardClick} {readOnly} />
		{/each}
	</g>
</svg>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		background: var(--bg-canvas);
		cursor: grab;
		transition: background 0.3s ease;
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

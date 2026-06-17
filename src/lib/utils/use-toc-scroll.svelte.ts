import { onMount } from 'svelte';

/**
 * Scroll-spy rune for the zine table-of-contents.
 *
 * Observes each section element (by id) and tracks which one is currently in
 * the reading band. Returns reactive `activeId` and an `isPast(id)` predicate
 * so the TOC can dim sections the reader has already passed.
 *
 * Usage (inside a component's <script>):
 *   const toc = useTocScroll(['intro', 'structure', ...]);
 *   // toc.activeId, toc.isPast('intro')
 *
 * Must be called during component init (it wires up onMount internally).
 */
export function useTocScroll(ids: string[]): { readonly activeId: string; isPast: (id: string) => boolean } {
	let activeId = $state('');

	function isPast(id: string): boolean {
		const ai = ids.indexOf(activeId);
		const ii = ids.indexOf(id);
		return ai > 0 && ii < ai;
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) activeId = e.target.id;
				}
			},
			{ rootMargin: '-10% 0px -85% 0px', threshold: 0 }
		);
		for (const id of ids) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});

	return {
		get activeId() {
			return activeId;
		},
		isPast
	};
}

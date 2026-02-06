/** Type guard for HTMLElement */
export function isHTMLElement(el: Element | EventTarget | null): el is HTMLElement {
	return el !== null && el instanceof HTMLElement;
}

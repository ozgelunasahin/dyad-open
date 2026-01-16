/** Type guard for HTMLElement */
export function isHTMLElement(el: Element | EventTarget | null): el is HTMLElement {
	return el !== null && el instanceof HTMLElement;
}

/** Type guard for specific HTML element type */
export function isElementOfType<T extends HTMLElement>(
	el: Element | null,
	constructor: new (...args: never[]) => T
): el is T {
	return el instanceof constructor;
}

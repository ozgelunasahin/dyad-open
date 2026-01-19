const STORAGE_KEY = 'spatial-reader-theme';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return 'light';

	// Check localStorage first
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// Default to light mode
	return 'light';
}

class ThemeStore {
	current = $state<Theme>('light');

	constructor() {
		if (typeof window !== 'undefined') {
			this.current = getInitialTheme();
			this.applyTheme();
		}
	}

	toggle() {
		// Disable transitions during theme change to prevent flicker
		if (typeof document !== 'undefined') {
			document.body.classList.add('theme-transition-none');
		}
		this.current = this.current === 'light' ? 'dark' : 'light';
		this.applyTheme();
		this.persist();
		// Re-enable transitions after a frame
		if (typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => {
				document.body.classList.remove('theme-transition-none');
			});
		}
	}

	private applyTheme() {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', this.current);
		}
	}

	private persist() {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, this.current);
		}
	}
}

export const themeStore = new ThemeStore();

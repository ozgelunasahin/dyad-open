const STORAGE_KEY = 'spatial-reader-theme';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return 'light';

	// Check localStorage first
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// Default to dark mode
	return 'dark';
}

class ThemeStore {
	current = $state<Theme>('dark');

	constructor() {
		if (typeof window !== 'undefined') {
			this.current = getInitialTheme();
			this.applyTheme();
		}
	}

	toggle() {
		this.current = this.current === 'light' ? 'dark' : 'light';
		this.applyTheme();
		this.persist();
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

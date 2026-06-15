// Analytics disabled — no-op.
export async function captureServer(
	_distinctId: string,
	_event: string,
	_properties?: Record<string, unknown>
): Promise<void> {}

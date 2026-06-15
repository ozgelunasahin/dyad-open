// Analytics disabled — all functions are no-ops.
export async function initPosthog(_apiKey: string, _userId?: string, _username?: string): Promise<void> {}
export async function identifyUser(_userId: string, _username: string): Promise<void> {}
export async function resetUser(): Promise<void> {}
export async function capture(_event: string, _properties?: Record<string, unknown>): Promise<void> {}

// Test shim for $app/environment. We always run as production-shape so
// the PoCs exercise the prod gate (dev bypass off).
export const dev = false;
export const browser = false;
export const building = false;
export const version = 'poc';

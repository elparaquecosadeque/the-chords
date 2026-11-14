let markReady!: () => void;

// Resolves once the app shell has mounted Count-In's YouTube host. The lib is
// loaded lazily (it's large), and the Count-In page waits for this so it never
// renders an inline player that the host would then replace.
export const countInHostReady = new Promise<void>((resolve) => (markReady = resolve));

export function markCountInHostReady(): void {
  markReady();
}

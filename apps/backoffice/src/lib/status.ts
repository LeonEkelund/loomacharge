// Tailwind color per connector status (the colored dots).
export const connectorColor: Record<string, string> = {
  available: 'bg-emerald-500',
  preparing: 'bg-amber-500',
  charging: 'bg-blue-500',
  finishing: 'bg-amber-500',
  faulted: 'bg-red-500',
  unavailable: 'bg-zinc-300',
}

// A charger is "online" if it checked in recently (within 5 minutes).
export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

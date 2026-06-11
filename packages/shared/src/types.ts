export type ChargerStatus =
  | 'available'
  | 'preparing'
  | 'charging'
  | 'finishing'
  | 'faulted'
  | 'unavailable'

export interface Charger {
  id: string
  name: string
  status: ChargerStatus
  lastSeen: string | null
}

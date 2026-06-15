import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { connectorColor, isOnline } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Site = {
  id: string
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  type: string | null
}
type Connector = { id: string; connector_id: number; status: string }
type Charger = {
  id: string
  identity: string
  name: string
  last_seen: string | null
  group_id: string | null
  connectors: Connector[]
}
type Group = { id: string; name: string }

export function SiteDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [site, setSite] = useState<Site | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [chargers, setChargers] = useState<Charger[]>([])
  const [loading, setLoading] = useState(true)

  // new group
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')

  // new charger (dialog opens for a specific group)
  const [chargerGroup, setChargerGroup] = useState<string | null>(null)
  const [chIdentity, setChIdentity] = useState('')
  const [chName, setChName] = useState('')
  const [chConnectors, setChConnectors] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: siteData }, { data: groupData }, { data: chargerData }] = await Promise.all([
      supabase.from('sites').select('id, name, address, postal_code, city, type').eq('id', id).single(),
      supabase.from('groups').select('id, name').eq('site_id', id).order('name'),
      supabase
        .from('chargers')
        .select('id, identity, name, last_seen, group_id, connectors(id, connector_id, status)')
        .eq('site_id', id),
    ])
    setSite(siteData)
    setGroups(groupData ?? [])
    setChargers((chargerData as Charger[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function createGroup() {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('groups').insert({ site_id: id, name: groupName.trim() })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setGroupName('')
    setGroupOpen(false)
    setBusy(false)
    load()
  }

  async function createCharger() {
    if (!chargerGroup) return
    setBusy(true)
    setError('')
    const identity =
      chIdentity.trim() || `CP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const { data: ch, error: chErr } = await supabase
      .from('chargers')
      .insert({
        site_id: id,
        group_id: chargerGroup,
        identity,
        name: chName.trim(),
        status: 'unavailable',
      })
      .select('id')
      .single()
    if (chErr || !ch) {
      setError(chErr?.message ?? 'Could not create charger')
      setBusy(false)
      return
    }
    const count = parseInt(chConnectors, 10)
    const rows = Array.from({ length: count }, (_, i) => ({
      charger_id: ch.id,
      connector_id: i + 1,
      status: 'unavailable',
    }))
    const { error: cErr } = await supabase.from('connectors').insert(rows)
    if (cErr) {
      setError(cErr.message)
      setBusy(false)
      return
    }
    setChIdentity('')
    setChName('')
    setChConnectors('1')
    setChargerGroup(null)
    setBusy(false)
    load()
  }

  return (
    <div>
      <Link
        to="/sites"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <FiArrowLeft /> Sites
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{site?.name ?? '…'}</h1>
          {site && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[site.address, site.postal_code, site.city].filter(Boolean).join(', ') || 'No address'}
              {site.type ? ` · ${site.type}` : ''}
            </p>
          )}
        </div>
        {isAdmin && (
          <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
            <DialogTrigger asChild>
              <Button>New group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New group</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Group name (e.g. Parking level 1)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button onClick={createGroup} disabled={busy || !groupName.trim()}>
                  {busy ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Groups</h2>
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          {groups.map((g) => {
            const groupChargers = chargers.filter((c) => c.group_id === g.id)
            return (
              <div key={g.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{g.name}</p>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setChargerGroup(g.id)}>
                      Add charger
                    </Button>
                  )}
                </div>

                {groupChargers.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No chargers yet</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {groupChargers.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            title={isOnline(c.last_seen) ? 'Online' : 'Offline'}
                            className={`inline-block h-2 w-2 rounded-full ${
                              isOnline(c.last_seen) ? 'bg-emerald-500' : 'bg-zinc-300'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{c.identity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[...c.connectors]
                            .sort((a, b) => a.connector_id - b.connector_id)
                            .map((conn) => (
                              <span
                                key={conn.id}
                                title={`Connector ${conn.connector_id}: ${conn.status}`}
                                className={`inline-block h-3 w-3 rounded-full ${
                                  connectorColor[conn.status] ?? 'bg-zinc-300'
                                }`}
                              />
                            ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add charger dialog */}
      <Dialog open={chargerGroup !== null} onOpenChange={(o) => !o && setChargerGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add charger</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="OCPP identity (optional — auto-generated)"
            value={chIdentity}
            onChange={(e) => setChIdentity(e.target.value)}
          />
          <Input placeholder="Name" value={chName} onChange={(e) => setChName(e.target.value)} />
          <Select value={chConnectors} onValueChange={setChConnectors}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="1">1 connector</SelectItem>
              <SelectItem value="2">2 connectors</SelectItem>
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button onClick={createCharger} disabled={busy || !chName.trim()}>
              {busy ? 'Adding…' : 'Add charger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

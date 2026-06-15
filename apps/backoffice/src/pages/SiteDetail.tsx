import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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

type Site = {
  id: string
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  type: string | null
}
type Group = { id: string; name: string }

export function SiteDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [site, setSite] = useState<Site | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: siteData }, { data: groupData }] = await Promise.all([
      supabase.from('sites').select('id, name, address, postal_code, city, type').eq('id', id).single(),
      supabase.from('groups').select('id, name').eq('site_id', id).order('name'),
    ])
    setSite(siteData)
    setGroups(groupData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function createGroup() {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('groups').insert({ site_id: id, name: name.trim() })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setName('')
    setOpen(false)
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New group</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Group name (e.g. Parking level 1)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button onClick={createGroup} disabled={busy || !name.trim()}>
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
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border p-4">
              <p className="font-medium">{g.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">No chargers yet</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { geocode } from '@/lib/geocode'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Site = {
  id: string
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  type: string | null
}

export function Sites() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [type, setType] = useState('public')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('sites')
      .select('id, name, address, postal_code, city, type')
      .order('name')
    setSites(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createSite() {
    setBusy(true)
    setError('')
    const coords = await geocode(`${address}, ${postalCode} ${city}`)
    const { error } = await supabase.from('sites').insert({
      name: name.trim(),
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
      type,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      org_id: profile?.org_id,
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    setName('')
    setAddress('')
    setPostalCode('')
    setCity('')
    setType('public')
    setOpen(false)
    setBusy(false)
    load()
  }

  const filtered = sites.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New site</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New site</DialogTitle>
              </DialogHeader>
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <div className="flex gap-2">
                <Input
                  placeholder="Postal code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                </SelectContent>
              </Select>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button onClick={createSite} disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Input
        placeholder="Search sites…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 max-w-xs"
      />

      <div className="mt-4 rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">No sites.</TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/sites/${s.id}`)}
                >
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.city ?? '—'}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{s.type ?? '—'}</TableCell>
                  <TableCell
                    className="font-mono text-xs text-muted-foreground"
                    title={s.id}
                  >
                    {s.id.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

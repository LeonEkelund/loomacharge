import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
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

type Member = { id: string; email: string | null; role: string }
type Org = { id: string; name: string }

export function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!id) return
    setLoading(true)
    const [{ data: orgData }, { data: memberData }] = await Promise.all([
      supabase.from('organizations').select('id, name').eq('id', id).single(),
      supabase.from('profiles').select('id, email, role').eq('org_id', id),
    ])
    setOrg(orgData)
    setMembers(memberData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function addMember() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.functions.invoke('create-member', {
      body: { email, password, role, org_id: id },
    })
    if (error) {
      let message = error.message
      try {
        const body = await error.context.json()
        if (body?.error) message = body.error
      } catch {
        // keep the generic message
      }
      setError(message)
      setBusy(false)
      return
    }
    if (data?.error) {
      setError(data.error)
      setBusy(false)
      return
    }
    setEmail('')
    setPassword('')
    setRole('viewer')
    setOpen(false)
    setBusy(false)
    load()
  }

  return (
    <div>
      <Link
        to="/organizations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <FiArrowLeft /> Organizations
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{org?.name ?? '…'}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add member</DialogTitle>
            </DialogHeader>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button onClick={addMember} disabled={busy || !email || !password}>
                {busy ? 'Adding…' : 'Add member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Members</h2>
      <div className="mt-2 rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">No members yet.</TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.email}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{m.role}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

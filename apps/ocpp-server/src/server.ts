import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { RPCServer, createRPCError } from 'ocpp-rpc'
import { createSupabaseClient } from '@loomacharge/db'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../../.env') })

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PORT = Number(process.env.PORT) || 9000

// OCPP 1.6 StatusNotification value -> our connector status enum.
function mapStatus(ocpp: string): string {
  switch (ocpp) {
    case 'Available':
      return 'available'
    case 'Preparing':
    case 'Reserved':
      return 'preparing'
    case 'Charging':
    case 'SuspendedEV':
    case 'SuspendedEVSE':
      return 'charging'
    case 'Finishing':
      return 'finishing'
    case 'Faulted':
      return 'faulted'
    default:
      return 'unavailable'
  }
}

async function chargerIdFor(identity: string): Promise<string | null> {
  const { data } = await supabase.from('chargers').select('id').eq('identity', identity).single()
  return data?.id ?? null
}

function touch(chargerId: string) {
  return supabase.from('chargers').update({ last_seen: new Date().toISOString() }).eq('id', chargerId)
}

const server = new RPCServer({ protocols: ['ocpp1.6'] })

server.on('client', (client) => {
  const identity = client.identity
  console.log(`Charger connected: ${identity}`)

  // Resolve the charger row lazily (and cache it) so handlers register
  // synchronously — the charger sends BootNotification immediately on connect.
  let cached: Promise<string | null> | undefined
  const getChargerId = () => (cached ??= chargerIdFor(identity))

  client.handle('BootNotification', async () => {
    const chargerId = await getChargerId()
    if (chargerId) {
      await supabase
        .from('chargers')
        .update({ last_seen: new Date().toISOString(), status: 'available' })
        .eq('id', chargerId)
    } else {
      console.warn(`No charger row for identity: ${identity}`)
    }
    return { status: 'Accepted', interval: 60, currentTime: new Date().toISOString() }
  })

  client.handle('Heartbeat', async () => {
    const chargerId = await getChargerId()
    if (chargerId) await touch(chargerId)
    return { currentTime: new Date().toISOString() }
  })

  client.handle('StatusNotification', async ({ params }) => {
    const chargerId = await getChargerId()
    const { connectorId, status } = params as { connectorId: number; status: string }
    if (chargerId) {
      await touch(chargerId)
      if (connectorId === 0) {
        await supabase.from('chargers').update({ status: mapStatus(status) }).eq('id', chargerId)
      } else {
        await supabase
          .from('connectors')
          .update({ status: mapStatus(status) })
          .eq('charger_id', chargerId)
          .eq('connector_id', connectorId)
      }
    }
    return {}
  })

  client.handle('Authorize', async () => ({ idTagInfo: { status: 'Accepted' } }))
  client.handle('StartTransaction', async () => ({
    transactionId: Math.floor(Math.random() * 1_000_000_000),
    idTagInfo: { status: 'Accepted' },
  }))
  client.handle('StopTransaction', async () => ({ idTagInfo: { status: 'Accepted' } }))
  client.handle('MeterValues', async () => ({}))
  client.handle('DataTransfer', async () => ({ status: 'Accepted' }))

  // Anything else: acknowledge that it's not implemented.
  client.handle(({ method }) => {
    console.log(`Unhandled OCPP method from ${identity}: ${method}`)
    throw createRPCError('NotImplemented')
  })

  client.on('close', () => console.log(`Charger disconnected: ${identity}`))
})

await server.listen(PORT)
console.log(`OCPP 1.6 server listening on ws://localhost:${PORT}`)
console.log('Chargers connect at ws://localhost:9000/<identity>  (e.g. ws://localhost:9000/CP-A1B2C3)')

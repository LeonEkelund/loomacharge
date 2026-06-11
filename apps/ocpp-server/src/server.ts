import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 9000 })

wss.on('connection', (ws) => {
  ws.on('error', console.error)

  ws.on('message', (data) => {
    console.log('received: %s', data)
  })
})

console.log('OCPP server listening on ws://localhost:9000')

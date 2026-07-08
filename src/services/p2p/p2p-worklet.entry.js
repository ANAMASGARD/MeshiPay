/* Bare worklet entry — Hyperswarm topic room for tip pool events */
const Hyperswarm = require('hyperswarm')
const b4a = require('b4a')

const { IPC } = BareKit

const swarm = new Hyperswarm({ firewall: false })
const sockets = new Set()
let activeTopic = null

function peerCount() {
  return sockets.size
}

function sendToHost(payload) {
  IPC.write(b4a.from(JSON.stringify(payload)))
}

function broadcastToPeers(event) {
  const data = b4a.from(JSON.stringify({ kind: 'event', event }))
  for (const socket of sockets) {
    try {
      socket.write(data)
    } catch (_) {
      // peer may have disconnected
    }
  }
}

swarm.on('connection', (socket) => {
  sockets.add(socket)
  sendToHost({ kind: 'status', peerCount: peerCount() })

  socket.on('data', (data) => {
    try {
      const message = JSON.parse(b4a.toString(data))
      if (message.kind === 'event' && message.event) {
        sendToHost(message)
      }
    } catch (_) {
      // ignore malformed peer payloads
    }
  })

  socket.on('close', () => {
    sockets.delete(socket)
    sendToHost({ kind: 'status', peerCount: peerCount() })
  })

  socket.on('error', () => {
    sockets.delete(socket)
    sendToHost({ kind: 'status', peerCount: peerCount() })
  })
})

IPC.on('data', (data) => {
  let message
  try {
    message = JSON.parse(b4a.toString(data))
  } catch (_) {
    return
  }

  if (message.cmd === 'join' && message.topic) {
    // Hash arbitrary room strings to a 32-byte Hyperswarm topic
    const topicKey = b4a.from(message.topic, 'utf8')
    activeTopic = b4a.alloc(32)
    b4a.fill(activeTopic, 0)
    topicKey.copy(activeTopic, 0, 0, Math.min(topicKey.length, 32))
    swarm.join(activeTopic, { server: true, client: true })
    swarm.flush().then(() => {
      sendToHost({ kind: 'joined', topic: message.topic, peerCount: peerCount() })
    })
    return
  }

  if (message.cmd === 'leave') {
    if (activeTopic) {
      swarm.leave(activeTopic)
      activeTopic = null
    }
    for (const socket of sockets) socket.destroy()
    sockets.clear()
    sendToHost({ kind: 'left', peerCount: 0 })
    return
  }

  if (message.cmd === 'broadcast' && message.event) {
    broadcastToPeers(message.event)
    sendToHost({ kind: 'event', event: message.event })
    return
  }

  if (message.cmd === 'status') {
    sendToHost({ kind: 'status', peerCount: peerCount() })
  }
})

sendToHost({ kind: 'ready' })

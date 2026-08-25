// Bot Minecraft Bedrock Edition - versão para Replit
// Conecta em servidor Aternos sem autenticação e anda sozinho aleatoriamente

const bedrock = require('bedrock-protocol')

// ==== CONFIGURAÇÃO ====
const HOST = 'testealpha-EHbK.aternos.me'
const PORT = 43890
const USERNAME = 'MeuBot'

// Se o bot ficar caindo com "outdated client/server", descubra a versão
// do seu servidor no painel do Aternos e coloque aqui, ex: '1.21.50'.
// Deixe null para a lib tentar detectar automaticamente.
const FORCE_VERSION = '1.26.44'

let client = null
let position = { x: 0, y: 0, z: 0 }
let rotation = { yaw: 0, pitch: 0 }
let spawned = false
let walkInterval = null
let runtimeEntityId = null
let reconnecting = false

function createBot() {
  const options = {
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true
  }
  if (FORCE_VERSION) options.version = FORCE_VERSION

  client = bedrock.createClient(options)

  client.on('connect', () => {
    console.log('[Bot] Conectando ao servidor...')
  })

  client.on('join', () => {
    console.log('[Bot] Pacote "join" recebido (handshake ok).')
  })

  // 'start_game' traz a posição inicial real do jogador
  client.on('start_game', (packet) => {
    runtimeEntityId = packet.runtime_entity_id
    position = {
      x: packet.player_position.x,
      y: packet.player_position.y,
      z: packet.player_position.z
    }
    console.log('[Bot] Posição inicial recebida:', position)
  })

  client.on('spawn', () => {
    if (spawned) return
    spawned = true
    console.log('[Bot] Spawnou no mundo com sucesso!')

    client.queue('text', {
      type: 'chat',
      needs_translation: false,
      source_name: USERNAME,
      xuid: '',
      platform_chat_id: '',
      filtered_message: '',
      message: 'Olá! O bot está online.'
    })

    startRandomWalk()
  })

  client.on('text', (packet) => {
    if (packet.type === 'chat') {
      console.log(`[Chat] ${packet.source_name}: ${packet.message}`)
    }
  })

  // Motivo real da queda aparece aqui - printamos o pacote inteiro
  client.on('disconnect', (packet) => {
    console.log('[Bot] DESCONECTADO. Motivo do servidor:', JSON.stringify(packet))
    cleanupAndReconnect()
  })

  client.on('error', (err) => {
    console.error('[Bot] Erro de conexão:', err.message || err)
    cleanupAndReconnect()
  })

  client.on('close', () => {
    console.log('[Bot] Conexão fechada (socket close).')
    cleanupAndReconnect()
  })
}

function cleanupAndReconnect() {
  if (reconnecting) return
  reconnecting = true

  spawned = false
  if (walkInterval) {
    clearInterval(walkInterval)
    walkInterval = null
  }

  setTimeout(() => {
    console.log('[Bot] Tentando reconectar...')
    reconnecting = false
    createBot()
  }, 5000)
}

function sendMovePacket() {
  if (!client || !spawned || runtimeEntityId == null) return

  client.queue('move_player', {
    runtime_id: runtimeEntityId,
    position: position,
    pitch: rotation.pitch,
    yaw: rotation.yaw,
    head_yaw: rotation.yaw,
    mode: 'normal',
    on_ground: true,
    ridden_runtime_id: 0,
    tick: BigInt(0)
  })
}

function startRandomWalk() {
  walkInterval = setInterval(() => {
    if (!spawned) return

    if (Math.random() < 0.2) {
      rotation.yaw = Math.random() * 360 - 180
    }

    const stepSize = 0.2
    const radians = (rotation.yaw * Math.PI) / 180
    position.x += Math.sin(radians) * stepSize
    position.z += Math.cos(radians) * stepSize

    sendMovePacket()
  }, 500)
}

createBot()

// Mantém o processo do Replit vivo
setInterval(() => {}, 1000 * 60)

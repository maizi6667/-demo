// utils/tripWebSocket.js
const WS_URL = 'ws://localhost:48080/ws/trip'

let socketTask = null
let reconnectTimer = null
let reconnectCount = 0
const MAX_RECONNECT = 5

const handlers = {}

export function onMessage(type, callback) {
  if (!handlers[type]) handlers[type] = []
  handlers[type].push(callback)
  return () => {
    handlers[type] = handlers[type].filter(fn => fn !== callback)
  }
}

export function sendMessage(type, data = {}) {
  if (!socketTask) {
    console.warn('[WS] 连接不存在，无法发送消息')
    return false
  }
  const message = { type, data, timestamp: Date.now() }
  try {
    socketTask.send({
      data: JSON.stringify(message),
      fail: (err) => {
        console.error('[WS] 发送消息失败', err)
        return false
      }
    })
    console.log('[WS] 消息已发送:', message)
    return true
  } catch (err) {
    console.error('[WS] 发送消息异常', err)
    return false
  }
}

export function isConnected() {
  return socketTask !== null
}

export function connect() {
  const token = uni.getStorageSync('accessToken')
  if (!token) {
    console.warn('[WS] 未登录，跳过连接')
    return
  }
  if (socketTask) {
    console.log('[WS] 已有连接，跳过')
    return
  }

  const url = `${WS_URL}?token=${encodeURIComponent(token)}`
  socketTask = uni.connectSocket({ url, fail: (err) => {
    console.error('[WS] 创建连接失败', err)
    socketTask = null
    scheduleReconnect()
  }})

  socketTask.onOpen(() => {
    console.log('[WS] 连接已打开')
    reconnectCount = 0
    clearTimeout(reconnectTimer)
    startHeartbeat()
  })

  socketTask.onMessage(({ data }) => {
    console.log('[WS] 收到原始消息:', data)
    // 处理纯文本心跳
    if (data === 'pong' || data === 'ping') {
      console.log('[WS] 收到心跳响应:', data)
      return
    }
    let msg
    try {
      msg = JSON.parse(data)
    } catch (e) {
      console.error('[WS] 消息解析失败，原始数据:', data, e)
      return
    }
    if (msg.type === 'ACK') {
      console.log('[WS] 服务端确认连接')
      return
    }
    const list = handlers[msg.type] || []
    list.forEach(fn => {
      try { fn(msg) } catch (e) { console.error('[WS] 处理器异常', e) }
    })
  })

  socketTask.onError((err) => {
    console.error('[WS] 连接错误', err)
  })

  socketTask.onClose(() => {
    console.log('[WS] 连接关闭')
    stopHeartbeat()
    socketTask = null
    scheduleReconnect()
  })
}

export function disconnect() {
  clearTimeout(reconnectTimer)
  reconnectTimer = null
  stopHeartbeat()
  if (socketTask) {
    socketTask.close()
    socketTask = null
  }
  reconnectCount = 0
}

let heartbeatTimer = null
function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (socketTask) {
      socketTask.send({ data: 'ping', fail: () => {} })
    }
  }, 25000)
}
function stopHeartbeat() {
  clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function scheduleReconnect() {
  if (reconnectCount >= MAX_RECONNECT) {
    console.warn('[WS] 重连次数达上限，放弃')
    return
  }
  const delay = Math.min(1000 * 2 ** reconnectCount, 30000)
  reconnectCount++
  console.log(`[WS] ${delay / 1000}s 后重连（第${reconnectCount}次）`)
  reconnectTimer = setTimeout(() => {
    connect()
  }, delay)
}
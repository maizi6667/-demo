// utils/tripWebSocket.js
// 行程 WebSocket 客户端，在 App.vue onLaunch 初始化，页面直接引用

const WS_URL = 'wss://localhost:48080/ws/trip' // ← 改成你的域名

let socketTask = null
let reconnectTimer = null
let reconnectCount = 0
const MAX_RECONNECT = 5

// 消息处理器注册表：type -> callback[]
const handlers = {}

/**
 * 注册消息处理器
 * @example
 *   import { onMessage } from '@/utils/tripWebSocket'
 *   onMessage('TRIP_DEPARTURE', (msg) => { ... })
 */
export function onMessage(type, callback) {
  if (!handlers[type]) handlers[type] = []
  handlers[type].push(callback)
  // 返回取消注册函数
  return () => {
    handlers[type] = handlers[type].filter(fn => fn !== callback)
  }
}

/** 建立连接（登录后调用一次） */
export function connect() {
  const token = uni.getStorageSync('token')
  if (!token) {
    console.warn('[WS] 未登录，跳过连接')
    return
  }
  if (socketTask) {
    console.log('[WS] 已有连接，跳过')
    return
  }

  const url = `${WS_URL}?token=${encodeURIComponent(token)}`
  socketTask = uni.connectSocket({
    url,
    fail: (err) => {
      console.error('[WS] 创建连接失败', err)
      socketTask = null
      scheduleReconnect()
    }
  })

  socketTask.onOpen(() => {
    reconnectCount = 0
    clearTimeout(reconnectTimer)
    startHeartbeat()
  })

  socketTask.onMessage(({ data }) => {
    let msg
    try { msg = JSON.parse(data) } catch { return }
    if (msg.type === 'ACK') {
      console.log('[WS] 服务端确认连接')
      return
    }
    // 分发给注册的处理器
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

/** 主动断开（退出登录时调用） */
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

// -------- 心跳 --------
let heartbeatTimer = null

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (socketTask) {
      socketTask.send({ data: 'ping', fail: () => {} })
    }
  }, 25000) // 每25秒 ping 一次
}

function stopHeartbeat() {
  clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

// -------- 断线重连 --------
function scheduleReconnect() {
  if (reconnectCount >= MAX_RECONNECT) {
    console.warn('[WS] 重连次数达上限，放弃')
    return
  }
  const delay = Math.min(1000 * 2 ** reconnectCount, 30000) // 指数退避，最长30s
  reconnectCount++
  console.log(`[WS] ${delay / 1000}s 后重连（第${reconnectCount}次）`)
  reconnectTimer = setTimeout(() => {
    connect()
  }, delay)
}

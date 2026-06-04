<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view class="back-btn" @click="goBack">←</view>
      <view class="header-text">
        <text class="title">{{ pageTitle }}</text>
        <text class="subtitle">{{ pageSubtitle }}</text>
      </view>
      <view class="status-pill" :class="statusClass" v-if="!isDriver">{{ statusText }}</view>
    </view>

    <!-- 身份切换栏 -->
    <view class="role-tab-bar">
      <view class="role-tab" :class="{ active: activeRole === 'driver' }" @click="activeRole = 'driver'">🚗 司机通知</view>
      <view class="role-tab" :class="{ active: activeRole === 'passenger' }" @click="activeRole = 'passenger'">👤 乘客通知</view>
    </view>

    <scroll-view class="content" scroll-y>
      <!-- ========== 乘客视角 ========== -->
      <block v-if="!isDriver">
        <!-- 实时消息卡片（新增） -->
        <view class="card msg-card">
          <view class="card-label">
            <text class="label-icon">📨</text>
            <text>实时消息</text>
            <text class="badge" v-if="receivedMessages.length">{{ receivedMessages.length }}</text>
          </view>
          <view v-if="receivedMessages.length === 0" class="empty-msg">
            <text>暂无接收到的消息</text>
          </view>
          <view v-else class="msg-list">
            <view v-for="(item, idx) in receivedMessages" :key="idx" class="msg-item">
              <view class="msg-header">
                <text class="msg-type">{{ item.title }}</text>
                <text class="msg-time">{{ item.time }}</text>
              </view>
              <view class="msg-body">
                <view v-if="item.startPlace || item.endPlace" class="msg-row">
                  <text class="label">📍 行程：</text>
                  <text class="value">{{ item.startPlace || '?' }} → {{ item.endPlace || '?' }}</text>
                </view>
                <view v-if="item.departTime" class="msg-row">
                  <text class="label">⏰ 出发时间：</text>
                  <text class="value">{{ item.departTime }}</text>
                </view>
                <view v-if="item.message" class="msg-row">
                  <text class="label">💬 留言：</text>
                  <text class="value">{{ item.message }}</text>
                </view>
                <view v-if="item.extra" class="msg-row">
                  <text class="label">📎 附加：</text>
                  <text class="value">{{ item.extra }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 原有行程卡片 -->
        <view class="card route-card">
          <view class="card-label">当前行程</view>
          <view class="route-line">
            <view class="dot start"></view>
            <text class="route-text">{{ routeDetail.startPlace || startPlace || '未设置出发地' }}</text>
          </view>
          <view class="route-arrow">↓</view>
          <view class="route-line">
            <view class="dot end"></view>
            <text class="route-text">{{ routeDetail.endPlace || endPlace || '未设置目的地' }}</text>
          </view>
          <view class="route-meta">
            <view class="meta-item">
              <text class="meta-label">行程ID</text>
              <text class="meta-value">{{ tripId || '-' }}</text>
            </view>
            <view class="meta-item">
              <text class="meta-label">出发时间</text>
              <text class="meta-value">{{ formatDateTime(routeDetail.departTime) }}</text>
            </view>
            <view class="meta-item">
              <text class="meta-label">司机</text>
              <text class="meta-value">{{ routeDetail.driverName || driverName || '-' }}</text>
            </view>
          </view>
        </view>

        <view class="card notices-card">
          <view class="card-label">
            <text class="label-icon">🔔</text>
            <text>司机通知</text>
          </view>
          <view v-if="!notices || notices.length === 0" class="empty-notice">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无通知消息</text>
            <text class="empty-sub">司机确认出发或到达后，消息将显示在这里</text>
          </view>
          <view v-else>
            <view v-for="(notice, idx) in notices" :key="idx" class="notice-item" :class="{ unread: !notice.read }">
              <view class="notice-badge" :class="notice.actionType === 'arrival' ? 'arrived' : 'departed'">
                {{ notice.actionType === 'arrival' ? '已到达' : '已出发' }}
              </view>
              <view class="notice-content">
                <text class="notice-msg">{{ notice.message }}</text>
                <text class="notice-time">{{ notice.time }}</text>
              </view>
              <view class="unread-dot" v-if="!notice.read"></view>
            </view>
          </view>
        </view>

        <view class="card boarding-card" v-if="canBoard">
          <view class="card-label">
            <text class="label-icon">✅</text>
            <text>确认上车</text>
          </view>
          <view class="boarding-hint">司机已出发，请确认你已上车。</view>
          <view class="boarding-status" v-if="boardingConfirmed">
            <text class="confirmed-icon">✓</text>
            <text class="confirmed-text">已确认上车</text>
          </view>
        </view>
      </block>

      <!-- ========== 司机视角 ========== -->
      <view v-else class="driver-module">
        <!-- WebSocket 测试卡片（司机专用） -->
        <view class="card ws-test-card">
          <view class="card-label">
            <text class="label-icon">🔌</text>
            <text>WebSocket 测试</text>
          </view>
          <view class="ws-status">
            状态：<text :class="wsConnected ? 'status-on' : 'status-off'">
              {{ wsConnected ? '已连接' : '未连接' }}
            </text>
          </view>
          <button class="ws-btn" @click="sendTestMessage" :disabled="!wsConnected">
            发送测试消息 (userId 146)
          </button>
          <view v-if="wsMessages.length" class="ws-log">
            <view class="log-title">消息日志：</view>
            <scroll-view scroll-y class="log-scroll">
              <view v-for="(log, idx) in wsMessages" :key="idx" class="log-item">
                <text class="log-time">{{ log.time }}</text>
                <text class="log-content">{{ log.content }}</text>
              </view>
            </scroll-view>
          </view>
        </view>

        <view v-if="tripList.length === 0" class="empty-apply">
          <text class="empty-icon">🚗</text>
          <text class="empty-text">暂无行程</text>
          <text class="empty-sub">您还没有发布过行程</text>
        </view>
        <view v-else>
          <view
            v-for="(trip, tripIndex) in tripList"
            :key="trip.userGetMyTripList.id"
            class="card trip-card"
          >
            <!-- 行程头部，点击展开/收起 -->
            <view class="trip-header" @click="toggleTrip(trip.userGetMyTripList.id)">
              <view class="trip-route">
                <text class="start">{{ trip.userGetMyTripList.startPlace || '未知起点' }}</text>
                <text class="arrow">→</text>
                <text class="end">{{ trip.userGetMyTripList.endPlace || '未知终点' }}</text>
              </view>
              <view class="trip-time">出发时间：{{ formatDateTime(trip.userGetMyTripList.departTime) }}</view>
              <view class="trip-meta">
                <text class="meta">座位数：{{ trip.userGetMyTripList.seatCount || '-' }}</text>
                <text class="meta">价格：¥{{ trip.userGetMyTripList.price || 0 }}</text>
                <text class="meta apply-count">
                  申请 {{ trip.consumerList ? trip.consumerList.length : 0 }} 人
                </text>
                <text class="expand-icon">{{ expandedTrips[trip.userGetMyTripList.id] ? '▲' : '▼' }}</text>
              </view>
            </view>

            <!-- 下拉乘客申请列表 -->
            <view class="consumer-dropdown" v-if="expandedTrips[trip.userGetMyTripList.id]">
              <view class="list-title">乘客申请 ({{ trip.consumerList ? trip.consumerList.length : 0 }})</view>
              <view v-if="!trip.consumerList || trip.consumerList.length === 0" class="empty-consumer">
                <text>暂无乘客申请</text>
              </view>
              <view v-else>
                <view
                  v-for="consumer in trip.consumerList"
                  :key="consumer.id"
                  class="consumer-item"
                  @click="openDriverFlow(trip.userGetMyTripList, consumer)"
                >
                  <view class="consumer-header">
                    <text class="consumer-name">{{ consumer.username || ('乘客' + consumer.userId) }}</text>
                    <view class="apply-status" :class="{
                      'pending':  consumer.status == null || consumer.status === 0,
                      'approved': consumer.status === 1,
                      'rejected': consumer.status === 2
                    }">
                      {{ consumer.status === 1 ? '已批准' : (consumer.status === 2 ? '已拒绝' : '待审核') }}
                    </view>
                  </view>
                  <view class="consumer-info">
                    <view class="info-line">
                      <text class="label">👤 乘客ID</text>
                      <text class="value">{{ consumer.userId || '-' }}</text>
                    </view>
                    <view class="info-line">
                      <text class="label">📍 上车点</text>
                      <text class="value">{{ consumer.startPlace || trip.userGetMyTripList.startPlace || '未提供' }}</text>
                    </view>
                    <view class="info-line">
                      <text class="label">🏁 下车点</text>
                      <text class="value">{{ consumer.endPlace || trip.userGetMyTripList.endPlace || '未提供' }}</text>
                    </view>
                    <view class="info-line">
                      <text class="label">💰 价格</text>
                      <text class="value">¥{{ consumer.price || 0 }}</text>
                    </view>
                    <view class="info-line" v-if="consumer.mobile || consumer.phone">
                      <text class="label">📞 手机号</text>
                      <text class="value">{{ consumer.mobile || consumer.phone }}</text>
                    </view>
                    <view class="info-line" v-if="consumer.message">
                      <text class="label">💬 留言</text>
                      <text class="value message">{{ consumer.message }}</text>
                    </view>
                  </view>
                  <view class="apply-actions" v-if="consumer.status === null || consumer.status === 0">
                    <button class="action-btn reject" @click.stop="rejectConsumer(consumer, trip.userGetMyTripList.tripId)">拒绝</button>
                    <button class="action-btn approve" @click.stop="approveConsumer(consumer, trip.userGetMyTripList.tripId)">确认行程</button>
                  </view>
                  <view class="apply-actions" v-else>
                    <button
                      class="action-btn approve"
                      @click.stop="openDriverFlow(trip.userGetMyTripList, consumer)"
                    >
                      {{ trip.userGetMyTripList.status >= 4 ? '去到达确认' : '去出发确认' }}
                    </button>
                  </view>
                  <view class="apply-result" v-if="consumer.status === 1">
                    <text class="result-text approved">✓ 已批准</text>
                  </view>
                  <view class="apply-result" v-if="consumer.status === 2">
                    <text class="result-text rejected">✗ 已拒绝</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏（乘客专用） -->
    <view class="footer" v-if="!isDriver && canBoard && !boardingConfirmed">
      <button class="btn primary full" :disabled="sending" @click="confirmBoarding">✅ 确认上车</button>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js'
import { connect, onMessage, sendMessage, isConnected } from '@/utils/tripWebSocket.js'

export default {
  data() {
    return {
      activeRole: 'driver',
      expandedTrips: {},
      // 乘客数据
      tripId: null,
      startPlace: '',
      endPlace: '',
      driverName: '',
      routeDetail: {},
      notices: [],
      canBoard: false,
      boardingConfirmed: false,
      // 司机数据
      tripList: [],
      // 通用
      sending: false,
      loading: false,
      // WebSocket 相关
      wsConnected: false,
      wsMessages: [],        // 司机端调试日志
      receivedMessages: [],  // 乘客端解析后的消息列表
      unsubList: [],
      wsStatusTimer: null
    }
  },
  watch: {
    activeRole(newRole) {
      this.loadData()
    }
  },
  computed: {
    isDriver() {
      return this.activeRole === 'driver'
    },
    pageTitle() {
      return this.isDriver ? '行程及乘客申请' : '行程通知'
    },
    pageSubtitle() {
      return this.isDriver ? '查看您发布的行程和乘客申请' : '查看司机发送的出发和到达通知'
    },
    statusText() {
      const map = { 1: '待出发', 2: '已满员', 3: '已取消', 4: '已出发', 5: '已到达' }
      return map[this.routeDetail.status] || '等待中'
    },
    statusClass() {
      const map = { 1: 'pending', 2: 'full', 3: 'canceled', 4: 'departed', 5: 'arrived' }
      return map[this.routeDetail.status] || 'pending'
    }
  },
  onLoad(options) {
    if (options.role === 'passenger') this.activeRole = 'passenger'
    else if (options.role === 'driver') this.activeRole = 'driver'

    this.tripId = options.tripId ? Number(options.tripId) : null
    this.startPlace = options.startPlace ? decodeURIComponent(options.startPlace) : ''
    this.endPlace = options.endPlace ? decodeURIComponent(options.endPlace) : ''
    this.driverName = options.driverName ? decodeURIComponent(options.driverName) : ''

    if (this.startPlace || this.endPlace) {
      this.routeDetail = { startPlace: this.startPlace, endPlace: this.endPlace, driverName: this.driverName }
    }

    this.initWebSocket()
    this.loadData()
  },
  onUnload() {
    if (this.wsStatusTimer) clearInterval(this.wsStatusTimer)
    this.unsubList.forEach(unsub => unsub && unsub())
  },
  methods: {
    // ========== WebSocket 方法 ==========
    initWebSocket() {
      const token = uni.getStorageSync('accessToken')
      if (!token) {
        console.warn('[WS] 未登录，跳过初始化')
        return
      }
      connect()

      this.wsStatusTimer = setInterval(() => {
        this.wsConnected = isConnected()
      }, 1000)

      this.unsubList = []

      // 监听所有消息，统一解析并存入 receivedMessages（供乘客视角展示）
      this.unsubList.push(onMessage('*', (msg) => {
        console.log('[WS] 收到消息:', msg)
        this.parseAndAddMessage(msg)
      }))

      // 司机视角的调试日志（不影响乘客消息展示）
      this.unsubList.push(onMessage('TEST_REPLY', (msg) => {
        this.addWsLog(`✅ 后端回复: ${msg.data?.msg || JSON.stringify(msg)}`)
      }))
      this.unsubList.push(onMessage('TRIP_DEPARTURE', (msg) => {
        this.addWsLog(`🚗 行程已出发: ${msg.tripId || msg.data?.tripId}`)
      }))
      this.unsubList.push(onMessage('TRIP_ARRIVAL', (msg) => {
        this.addWsLog(`🏁 行程已到达: ${msg.tripId || msg.data?.tripId}`)
      }))
      this.unsubList.push(onMessage('APPLY_STATUS_CHANGED', (msg) => {
        this.addWsLog(`📝 申请状态变更: ${JSON.stringify(msg)}`)
        if (this.isDriver) this.loadDriverTrips()
      }))
    },

    // 解析消息并添加到 receivedMessages（乘客端展示用）
    parseAndAddMessage(msg) {
      const type = msg.type
      let title = ''
      let startPlace = ''
      let endPlace = ''
      let departTime = ''
      let message = ''
      let extra = ''

      if (type === 'TEST_REPLY') {
        title = '📨 后端回复'
        const data = msg.data || {}
        const echo = data.echo || {}
        startPlace = echo.startPlace || '未知'
        endPlace = echo.endPlace || '未知'
        departTime = echo.departTime ? this.formatDateTime(echo.departTime) : '未提供'
        message = data.msg || '无附加信息'
        extra = echo.content ? `司机说：${echo.content}` : ''
      }
      else if (type === 'TRIP_DEPARTURE') {
        title = '🚗 司机已出发'
        startPlace = msg.startPlace || msg.data?.startPlace || ''
        endPlace = msg.endPlace || msg.data?.endPlace || ''
        departTime = msg.departTime || msg.data?.departTime ? this.formatDateTime(msg.departTime || msg.data?.departTime) : ''
        message = msg.message || msg.data?.message || '我们出发啦！'
      }
      else if (type === 'TRIP_ARRIVAL') {
        title = '🏁 司机已到达'
        startPlace = msg.startPlace || msg.data?.startPlace || ''
        endPlace = msg.endPlace || msg.data?.endPlace || ''
        departTime = msg.departTime || msg.data?.departTime ? this.formatDateTime(msg.departTime || msg.data?.departTime) : ''
        message = msg.message || msg.data?.message || '已到达目的地'
      }
      else if (type === 'APPLY_STATUS_CHANGED') {
        title = '📝 申请状态变更'
        const status = msg.applyStatus || msg.data?.applyStatus
        message = status === 1 ? '你的乘车申请已被批准' : (status === 2 ? '你的乘车申请已被拒绝' : '状态未知')
      }
      else {
        // 未知类型，可选不展示或展示原始信息
        return
      }

      // 添加到列表顶部
      this.receivedMessages.unshift({
        title,
        startPlace,
        endPlace,
        departTime,
        message,
        extra,
        time: new Date().toLocaleTimeString()
      })
      // 保留最近30条
      if (this.receivedMessages.length > 30) this.receivedMessages.pop()
    },

    addWsLog(content) {
      const time = new Date().toLocaleTimeString()
      this.wsMessages.unshift({ time, content })
      if (this.wsMessages.length > 20) this.wsMessages.pop()
    },

    sendTestMessage() {
      if (!this.wsConnected) {
        uni.showToast({ title: 'WebSocket 未连接', icon: 'none' })
        return
      }
      const myUserId = uni.getStorageSync('userId') || 146
      
      let startPlace = '测试出发地'
      let endPlace = '测试目的地'
      let departTime = Date.now()
      if (this.tripList.length > 0 && this.tripList[0].userGetMyTripList) {
        const trip = this.tripList[0].userGetMyTripList
        startPlace = trip.startPlace || startPlace
        endPlace = trip.endPlace || endPlace
        departTime = trip.departTime || departTime
      }
      
      const success = sendMessage('TEST_MESSAGE', {
        targetUserId: myUserId,
        content: `Hello from 司机端! 时间: ${Date.now()}`,
        from: 'massage-page',
        startPlace: startPlace,
        endPlace: endPlace,
        departTime: departTime
      })
      if (success) {
        this.addWsLog(`发送测试消息给 ${myUserId}，行程：${startPlace} → ${endPlace}，出发时间：${this.formatDateTime(departTime)}`)
        uni.showToast({ title: '测试消息已发送', icon: 'success' })
      } else {
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },

    // ========== 原有业务方法 ==========
    toggleTrip(tripId) {
      const current = this.expandedTrips[tripId]
      this.$set(this.expandedTrips, tripId, !current)
    },

    async loadData() {
      this.loading = true
      try {
        if (this.isDriver) {
          await this.loadDriverTrips()
        } else {
          await this.loadPassengerData()
        }
      } catch (err) {
        console.error('加载数据失败', err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    async loadDriverTrips() {
      console.log('=== 开始请求司机数据 ===')
      const res = await request({
        url: '/user/driver/massage/getMassage',
        method: 'GET'
      })
      console.log('=== 返回结果 ===', JSON.stringify(res))
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '获取数据失败', icon: 'none' })
        this.tripList = []
        return
      }
      this.tripList = JSON.parse(JSON.stringify(res.data || []))
    },

    async loadPassengerData() {
      if (!this.tripId) {
        const cached = uni.getStorageSync('currentTripId')
        if (cached) this.tripId = Number(cached)
      }
      if (this.tripId) {
        await this.loadNotices()
      }
    },

    async loadNotices() {
      if (!this.tripId) return
      try {
        const res = await request({
          url: '/user/trip/notice/list',
          method: 'GET',
          data: { tripId: this.tripId }
        })
        if (res.code === 0) {
          const data = res.data
          this.notices = Array.isArray(data) ? data : (data?.list || [])
          this.canBoard = this.notices.some(n => n.actionType === 'departure')
          this.boardingConfirmed = data?.boardingConfirmed || false
        }
      } catch (err) {
        console.error('加载通知失败', err)
      }
    },

    async confirmBoarding() {
      if (this.sending) return
      uni.showModal({
        title: '确认上车',
        content: '确认你已经上车了吗？',
        success: async (modal) => {
          if (!modal.confirm) return
          this.sending = true
          try {
            const res = await request({
              url: '/user/trip/passenger/confirmBoarding',
              method: 'POST',
              data: { tripId: this.tripId }
            })
            if (res.code === 0) {
              this.boardingConfirmed = true
              uni.showToast({ title: '已确认上车', icon: 'success' })
            } else {
              uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
            }
          } catch (err) {
            uni.showToast({ title: '网络异常', icon: 'none' })
          } finally {
            this.sending = false
          }
        }
      })
    },

    async approveConsumer(consumer, tripId) {
      uni.showModal({
        title: '确认行程',
        content: `批准乘客 ${consumer.username || '匿名'} 的乘车申请？`,
        success: async (modal) => {
          if (!modal.confirm) return
          await this.updateConsumerStatus(consumer, tripId, 1)
        }
      })
    },

    async rejectConsumer(consumer, tripId) {
      uni.showModal({
        title: '拒绝申请',
        content: `拒绝乘客 ${consumer.username || '匿名'} 的乘车申请？`,
        success: async (modal) => {
          if (!modal.confirm) return
          await this.updateConsumerStatus(consumer, tripId, 2)
        }
      })
    },

    async updateConsumerStatus(consumer, tripId, status) {
      this.sending = true
      try {
        const res = await request({
          url: '/user/trip/apply/modifyStatusApply',
          method: 'PUT',
          data: {
            id: consumer.id,
            tripId: tripId,
            status: status
          }
        })
        if (res.code === 0) {
          consumer.status = status
          uni.showToast({ title: status === 1 ? '已批准' : '已拒绝', icon: 'success' })
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (err) {
        console.error(err)
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.sending = false
      }
    },

    openDriverFlow(trip, consumer) {
      if (!trip || !consumer) return
      if (consumer.status === null || consumer.status === 0) {
        uni.showToast({ title: '请先确认行程', icon: 'none' })
        return
      }
      const actionType = trip.status >= 4 ? 'arrival' : 'departure'
      const pageUrl = actionType === 'arrival'
        ? '/pages/driver/confirm-arrival'
        : '/pages/driver/driving'
      const query = [
        `tripId=${trip.tripId || trip.id || ''}`,
        `actionType=${actionType}`,
        `startPlace=${encodeURIComponent(trip.startPlace || consumer.startPlace || '')}`,
        `endPlace=${encodeURIComponent(trip.endPlace || consumer.endPlace || '')}`,
        `driverName=${encodeURIComponent(trip.driverName || trip.userName || '')}`,
        `consumerName=${encodeURIComponent(consumer.username || '')}`,
        `consumerId=${consumer.userId || ''}`,
        `consumerPhone=${encodeURIComponent(consumer.mobile || consumer.phone || '')}`,
        `consumerMessage=${encodeURIComponent(consumer.message || '')}`,
        `consumerPrice=${consumer.price || ''}`
      ].join('&')
      uni.navigateTo({ url: `${pageUrl}?${query}` })
    },

    formatDateTime(timestamp) {
      if (!timestamp) return '-'
      const d = new Date(timestamp)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },

    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
/* ========== 页面基础 ========== */
.page {
  min-height: 100vh;
  background: #f5f7fb;
}

/* ========== Header ========== */
.header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eef2f7;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  font-size: 32rpx;
  color: #111827;
  flex-shrink: 0;
}
.header-text { flex: 1; }
.title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
}
.subtitle {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #94a3b8;
}
.status-pill {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.status-pill.pending { background: #fef3c7; color: #d97706; }
.status-pill.full { background: #dbeafe; color: #2563eb; }
.status-pill.canceled { background: #fee2e2; color: #dc2626; }
.status-pill.departed { background: #dcfce7; color: #16a34a; }
.status-pill.arrived { background: #dbeafe; color: #2563eb; }

/* ========== 身份切换栏 ========== */
.role-tab-bar {
  display: flex;
  margin: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 6rpx;
}
.role-tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s;
}
.role-tab.active {
  background: #111827;
  color: #ffffff;
}

/* ========== 内容区域 ========== */
.content {
  height: calc(100vh - 260rpx);
  padding: 0 24rpx 140rpx;
  box-sizing: border-box;
}

/* ========== 卡片通用 ========== */
.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);
}
.card-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #111827;
}
.label-icon { font-size: 30rpx; }

/* ========== 实时消息卡片（乘客专用） ========== */
.msg-card {
  border-left: 8rpx solid #3b82f6;
}
.badge {
  background-color: #3b82f6;
  color: white;
  border-radius: 20rpx;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  margin-left: 12rpx;
}
.empty-msg {
  text-align: center;
  padding: 40rpx 0;
  color: #94a3b8;
  font-size: 26rpx;
}
.msg-list {
  max-height: 500rpx;
  overflow-y: auto;
}
.msg-item {
  border-bottom: 1rpx solid #f1f5f9;
  padding: 20rpx 0;
}
.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.msg-type {
  font-size: 26rpx;
  font-weight: 700;
  color: #1e293b;
}
.msg-time {
  font-size: 22rpx;
  color: #94a3b8;
}
.msg-body {
  margin-left: 16rpx;
}
.msg-row {
  display: flex;
  margin-bottom: 8rpx;
  font-size: 24rpx;
}
.msg-row .label {
  width: 140rpx;
  color: #64748b;
  flex-shrink: 0;
}
.msg-row .value {
  flex: 1;
  color: #334155;
  word-break: break-all;
}

/* ========== 乘客行程卡片 ========== */
.route-line {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.route-arrow {
  margin: 8rpx 0 8rpx 6rpx;
  font-size: 26rpx;
  color: #cbd5e1;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.start { background: #22c55e; }
.dot.end { background: #ef4444; }
.route-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}
.route-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f1f5f9;
}
.meta-item {
  flex: 1;
  min-width: 180rpx;
}
.meta-label {
  display: block;
  margin-bottom: 6rpx;
  font-size: 20rpx;
  color: #9ca3af;
}
.meta-value {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #111827;
}

/* ========== 乘客通知 ========== */
.empty-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0;
  gap: 12rpx;
}
.empty-icon { font-size: 64rpx; }
.empty-text { font-size: 28rpx; font-weight: 600; color: #111827; }
.empty-sub { font-size: 22rpx; color: #94a3b8; text-align: center; }
.notice-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}
.notice-item:last-child { border-bottom: none; }
.notice-item.unread {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 18rpx;
}
.notice-badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.notice-badge.departed { background: #dcfce7; color: #15803d; }
.notice-badge.arrived { background: #dbeafe; color: #1d4ed8; }
.notice-content { flex: 1; }
.notice-msg {
  display: block;
  margin-bottom: 6rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #1e293b;
}
.notice-time {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
}
.unread-dot {
  position: absolute;
  top: 20rpx;
  right: 0;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #3b82f6;
}

/* ========== 乘客确认上车 ========== */
.boarding-card {
  background: #f0fdf4;
  border: 1rpx solid #dcfce7;
}
.boarding-hint {
  margin-bottom: 14rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #15803d;
}
.boarding-status {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 18rpx;
  background: #dcfce7;
  border-radius: 14rpx;
}
.confirmed-icon {
  font-size: 30rpx;
  font-weight: 700;
  color: #16a34a;
}
.confirmed-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #15803d;
}

/* ========== 司机模块 ========== */
.empty-apply {
  text-align: center;
  padding: 80rpx 0;
}
.trip-card {
  margin-bottom: 24rpx;
}
.trip-header {
  margin-bottom: 0;
  cursor: pointer;
}
.trip-route {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
}
.trip-route .start { color: #22c55e; }
.trip-route .end { color: #ef4444; }
.trip-route .arrow { color: #94a3b8; }
.trip-time {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}
.trip-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid #f1f5f9;
  margin-top: 12rpx;
}
.trip-meta .meta {
  font-size: 24rpx;
  color: #64748b;
}
.apply-count {
  margin-left: auto;
  color: #3b82f6;
  font-weight: 600;
}
.expand-icon {
  font-size: 20rpx;
  color: #94a3b8;
}
.consumer-dropdown {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx dashed #f1f5f9;
}
.list-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #1e293b;
}
.empty-consumer {
  text-align: center;
  padding: 32rpx;
  color: #94a3b8;
}
.consumer-item {
  border-bottom: 1rpx solid #f1f5f9;
  padding: 20rpx 0;
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.consumer-item:active {
  transform: scale(0.99);
  background: #f8fafc;
}
.consumer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.consumer-name {
  font-size: 28rpx;
  font-weight: 700;
}
.apply-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.apply-status.pending { background: #fef3c7; color: #d97706; }
.apply-status.approved { background: #dcfce7; color: #15803d; }
.apply-status.rejected { background: #fee2e2; color: #dc2626; }
.consumer-info .info-line {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}
.consumer-info .info-line .label {
  width: 100rpx;
  color: #94a3b8;
  flex-shrink: 0;
}
.consumer-info .info-line .value {
  flex: 1;
  color: #1e293b;
  word-break: break-all;
}
.consumer-info .info-line .value.message {
  background: #f8fafc;
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
}
.apply-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.consumer-item .apply-actions {
  margin-top: 14rpx;
}
.action-btn {
  flex: 1;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
}
.action-btn.approve {
  background: #111827;
  color: white;
}
.action-btn.reject {
  background: #fee2e2;
  color: #dc2626;
}
.apply-result {
  margin-top: 16rpx;
  text-align: center;
}
.result-text {
  display: inline-block;
  padding: 6rpx 24rpx;
  border-radius: 24rpx;
}
.result-text.approved {
  background: #dcfce7;
  color: #15803d;
}
.result-text.rejected {
  background: #fee2e2;
  color: #dc2626;
}

/* ========== WebSocket 测试卡片（司机专用） ========== */
.ws-test-card {
  background: #f8fafc;
  border-left: 8rpx solid #3b82f6;
}
.ws-status {
  margin-bottom: 20rpx;
  font-size: 28rpx;
}
.status-on { color: #22c55e; font-weight: bold; }
.status-off { color: #ef4444; font-weight: bold; }
.ws-btn {
  background: #3b82f6;
  color: white;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin: 16rpx 0;
}
.ws-btn[disabled] { background: #94a3b8; }
.ws-log {
  margin-top: 20rpx;
  border-top: 1rpx solid #e2e8f0;
  padding-top: 12rpx;
}
.log-title {
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}
.log-scroll {
  max-height: 300rpx;
}
.log-item {
  font-size: 22rpx;
  padding: 6rpx 0;
  border-bottom: 1rpx dashed #e2e8f0;
}
.log-time {
  color: #94a3b8;
  margin-right: 16rpx;
}
.log-content {
  color: #1e293b;
}

/* ========== Footer ========== */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.96);
  border-top: 1rpx solid #eef2f7;
}
.btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 16rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
}
.btn.primary {
  background: #111827;
  color: #ffffff;
}
.btn.full {
  width: 100%;
}
.btn[disabled] { opacity: 0.5; }

/* ========== Loading ========== */
.loading-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,0.35);
  z-index: 1000;
}
.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 28rpx 40rpx;
  background: #ffffff;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #111827;
}
.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 4rpx solid #e5e7eb;
  border-top-color: #111827;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
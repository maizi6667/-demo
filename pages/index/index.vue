<template>
  <view class="container">
    <!-- 顶部 -->
    <view class="header">
      <view class="location">📍 南京工业大学</view>
      <view class="search-box">
        <input class="search-input" placeholder="搜索目的地、路线" />
        <button class="search-btn">搜索</button>
      </view>
    </view>

    <!-- banner -->
    <view class="banner">
      <view class="banner-left">
        <view class="banner-title">绿色出行</view>
        <view class="banner-sub">顺路拼车 · 安全便捷</view>
        <button class="publish-btn" @click="publishTrip">发布行程</button>
      </view>
      <image class="banner-img" src="https://cdn-icons-png.flaticon.com/512/744/744465.png" mode="aspectFit" />
    </view>

    <!-- 功能区 -->
    <view class="menu-grid">
      <view class="menu-item" @click="publishTrip">
        <view class="menu-icon blue">🚗</view>
        <text>发布行程</text>
      </view>
      <view class="menu-item">
        <view class="menu-icon green">🔍</view>
        <text>搜索路线</text>
      </view>
      <view class="menu-item" @click="goMyTrips">
        <view class="menu-icon orange">📄</view>
        <text>我的行程</text>
      </view>
      <view class="menu-item">
        <view class="menu-icon cyan">🛡️</view>
        <text>安全中心</text>
      </view>
    </view>

    <!-- WebSocket 测试区域 - 新增 -->
    <view class="section" v-if="showWsTest">
      <view class="section-header">
        <text class="title">🔌 WebSocket 测试</text>
      </view>
      <view class="ws-test-card">
        <view class="ws-status">
          <text>连接状态：</text>
          <text :class="wsConnected ? 'status-connected' : 'status-disconnected'">
            {{ wsConnected ? '已连接' : '未连接' }}
          </text>
        </view>
        <view class="ws-message-list" v-if="wsMessages.length">
          <view class="ws-message-title">收到的消息：</view>
          <view v-for="(msg, idx) in wsMessages" :key="idx" class="ws-message">
            <text class="ws-msg-time">{{ msg.time }}</text>
            <text class="ws-msg-content">{{ msg.content }}</text>
          </view>
        </view>
        <button class="ws-test-btn" @click="sendTestMessage" :disabled="!wsConnected">
          发送测试消息
        </button>
      </view>
    </view>

    <!-- 热门路线 -->
    <view class="section">
      <view class="section-header">
        <text class="title">🔥 热门路线</text>
        <text class="more" @click="viewMoreRoutes">更多 ></text>
      </view>
      <scroll-view scroll-x class="route-scroll">
        <view
          v-for="(route, index) in hotRoutes"
          :key="index"
          class="route-card"
          :class="{ active: index === 0 }"
          @click="searchByRoute(route)"
        >
          <view>{{ route.name }}</view>
          <text>{{ route.count }}个行程</text>
        </view>
      </scroll-view>
    </view>

    <!-- 最新行程 -->
    <view class="section">
      <view class="section-header">
        <text class="title">最新行程</text>
      </view>

      <view v-for="trip in latestTrips" :key="trip.tripId" class="trip-card">
        <image
          class="avatar"
          :src="trip.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'"
          mode="aspectFill"
        />
        <view class="trip-info">
          <view class="user-row">
            <text class="username">{{ trip.userName }}</text>
            <text class="tag">{{ trip.tag || '实名认证' }}</text>
          </view>
          <view class="route">{{ trip.startPlace }} → {{ trip.endPlace }}</view>
          <view class="time">{{ trip.departTimeDisplay }}</view>
        </view>
        <view class="trip-right">
          <view class="seat">{{ trip.seatCount }}个座位</view>
          <button
            class="join-btn"
            @tap="openApply(trip.tripId, trip.userName, `${trip.startPlace} → ${trip.endPlace}`)"
          >申请同行</button>
        </view>
      </view>

      <view v-if="loading" class="loading-text">加载中...</view>
      <view v-if="!loading && latestTrips.length === 0" class="empty-text">暂无行程数据</view>
    </view>

    <!-- tabbar -->
    <view class="tabbar">
      <view class="tab-item active-tab">
        <text>🏠</text>
        <view>首页</view>
      </view>
      <view class="tab-item">
        <text>🚘</text>
        <view>拼车大厅</view>
      </view>
      <view class="publish-center" @click="publishTrip">➕</view>
      <view class="tab-item" @click="goMassage">
        <text>💬</text>
        <view>消息</view>
      </view>
      <view class="tab-item" @click="goToProfile">
        <text>👤</text>
        <view>我的</view>
      </view>
    </view>

    <!-- 申请同行弹窗 -->
    <view v-if="showModal" class="modal-mask" @tap="closeModal">
      <view class="modal-box" @tap.stop>
        <view class="modal-handle" />
        <view class="modal-title">申请同行</view>
        <view class="modal-desc">{{ currentTrip.nickname }} | {{ currentTrip.route }}</view>
        <view class="modal-label">留言给司机（选填）</view>
        <textarea
          class="modal-textarea"
          v-model="applyMessage"
          placeholder="可说明出发地点、行李情况等..."
          placeholder-style="color:#bbb"
          :maxlength="200"
        />
        <view class="modal-footer">
          <button class="btn-cancel" @tap="closeModal">取消</button>
          <button class="btn-confirm" :disabled="submitting" @tap="submitApply">
            {{ submitting ? '提交中...' : '确认申请' }}
          </button>
        </view>
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
      showModal: false,
      submitting: false,
      applyMessage: '',
      loading: false,
      currentTrip: { tripId: 0, nickname: '', route: '' },
      hotRoutes: [],
      latestTrips: [],
      // WebSocket 相关 - 新增
      showWsTest: true,
      wsConnected: false,
      wsMessages: [],
      wsStatusTimer: null,
      unsubscribeList: []
    }
  },

  onLoad() {
    const token = uni.getStorageSync('accessToken')
    if (!token) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.getHotRoutes()
    this.getLatestTrips()
    // 初始化 WebSocket - 新增
    this.initWebSocket()
  },

  onUnload() {
    // 清理 WebSocket 监听 - 新增
    if (this.wsStatusTimer) {
      clearInterval(this.wsStatusTimer)
    }
    this.unsubscribeList.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe()
    })
  },

  methods: {
    // WebSocket 相关方法 - 新增
    initWebSocket() {
      connect()
      
      // 监听连接状态
      this.wsStatusTimer = setInterval(() => {
        this.wsConnected = isConnected()
      }, 1000)
      
      // 监听 ACK 消息
      const unsubAck = onMessage('ACK', (msg) => {
        console.log('收到 ACK:', msg)
        this.addWsMessage('ACK', `连接确认: ${msg.status}`)
      })
      
      // 监听行程发车消息
      const unsubDeparture = onMessage('TRIP_DEPARTURE', (msg) => {
        console.log('收到行程发车消息:', msg)
        this.addWsMessage('TRIP_DEPARTURE', `行程 ${msg.tripId} 已发车`)
      })
      
      // 监听行程到达消息
      const unsubArrival = onMessage('TRIP_ARRIVAL', (msg) => {
        console.log('收到行程到达消息:', msg)
        this.addWsMessage('TRIP_ARRIVAL', `行程 ${msg.tripId} 已到达`)
      })
      
      this.unsubscribeList = [unsubAck, unsubDeparture, unsubArrival]
    },
    
    addWsMessage(type, content) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      this.wsMessages.unshift({ time, type, content })
      if (this.wsMessages.length > 20) {
        this.wsMessages.pop()
      }
    },
    
    sendTestMessage() {
      if (!this.wsConnected) {
        uni.showToast({ title: 'WebSocket未连接', icon: 'none' })
        return
      }
      
      const success = sendMessage('TEST_MESSAGE', {
        content: 'Hello from 小程序!',
        timestamp: Date.now(),
        userId: uni.getStorageSync('userId')
      })
      
      if (success) {
        this.addWsMessage('SENT', '测试消息已发送')
        uni.showToast({ title: '消息已发送', icon: 'success' })
      } else {
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },

    // ── 跳转 ──────────────────────────────────────
    publishTrip() {
      uni.navigateTo({ url: '/pages/public/public' })
    },

    goToProfile() {
      uni.navigateTo({ url: '/pages/profile/profile' })
    },

    goMassage() {
      uni.navigateTo({ url: '/pages/massage/massage' })
    },

    goMyTrips() {
      uni.navigateTo({ url: '/pages/trip/trip-list' })
    },

    viewMoreRoutes() {
      uni.navigateTo({ url: '/pages/route-hot-list/route-hot-list' })
    },

    searchByRoute(route) {
      const [localBegin, localEnd] = route.name.split(' → ')
      uni.navigateTo({
        url: `/pages/route-hot-list/route-hot-list?localBegin=${encodeURIComponent(localBegin)}&localEnd=${encodeURIComponent(localEnd)}`
      })
    },

    // ── 弹窗 ──────────────────────────────────────
    openApply(tripId, nickname, route) {
      const trip = this.latestTrips.find(t => t.tripId === tripId)
      this.currentTrip = { 
        tripId, 
        nickname, 
        route,
        tripDriverTripId: trip ? trip.tripDriverTripId : null
      }
      this.applyMessage = ''
      this.showModal = true
    },

    closeModal() {
      this.showModal = false
    },

    submitApply() {
      if (this.submitting) return
      const token = uni.getStorageSync('accessToken')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        this.closeModal()
        uni.reLaunch({ url: '/pages/login/login' })
        return
      }
      const userId = uni.getStorageSync('userId')
      this.submitting = true
      request({
        url: '/admin-api/trip/apply/create',
        method: 'POST',
        data: {
          tripId: this.currentTrip.tripId,
          userId: Number(userId),
          status: 0,
          message: this.applyMessage.trim(),
          tripDriverTripId: this.currentTrip.tripDriverTripId
        }
      }).then(() => {
        this.closeModal()
        uni.showToast({ title: '申请已发送，等待确认', icon: 'success' })
      }).catch(err => {
        console.error('申请失败:', err)
        uni.showToast({ title: err.msg || '申请失败，请重试', icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
    },

    // ── 数据接口 ──────────────────────────────────
    getHotRoutes() {
      request({ url: '/carpool/routes/hot', method: 'GET' })
        .then(res => {
          if (res.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
            this.hotRoutes = res.data.map(item => ({
              name: `${item.localBegin || ''} → ${item.localEnd || ''}`,
              count: item.count || 0
            }))
          } else {
            this.hotRoutes = []
          }
        })
        .catch(err => {
          console.error('获取热门路线失败:', err)
          this.hotRoutes = []
        })
    },

    getLatestTrips() {
      this.loading = true
      request({ url: '/carpool/routes/latest', method: 'GET' })
        .then(res => {
          if (res.code === 0 && Array.isArray(res.data)) {
            this.latestTrips = res.data.map(item => {
              let departTimeDisplay = ''
              if (item.departTime) {
                const date = new Date(item.departTime)
                const now  = new Date()
                const today      = new Date(now.getFullYear(),  now.getMonth(),  now.getDate())
                const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                if (targetDate.getTime() === today.getTime()) {
                  departTimeDisplay = `今天 ${timeStr} 出发`
                } else if (targetDate.getTime() === today.getTime() + 86400000) {
                  departTimeDisplay = `明天 ${timeStr} 出发`
                } else {
                  departTimeDisplay = `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr} 出发`
                }
              }
              return {
                tripId: item.tripId || item.id,
                tripDriverTripId: item.tripDriverTripId,
                userName: item.userName,
                startPlace: item.startPlace,
                endPlace: item.endPlace,
                departTimeDisplay,
                seatCount: item.seatCount,
                avatar: item.image || 'https://randomuser.me/api/portraits/lego/1.jpg',
                tag: '实名认证'
              }
            })
          } else {
            this.latestTrips = []
          }
        })
        .catch(err => {
          console.error('获取最新行程失败:', err)
          uni.showToast({ title: '获取行程失败', icon: 'none' })
          this.latestTrips = []
        })
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style scoped>
.container { background: #f5f7fb; min-height: 100vh; padding-bottom: 140rpx; }
.header { padding: 30rpx; background: #fff; }
.location { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 50rpx; padding: 10rpx; }
.search-input { flex: 1; padding-left: 20rpx; font-size: 28rpx; }
.search-btn { background: #36c66d; color: #fff; border-radius: 40rpx; font-size: 26rpx; padding: 0 30rpx; }
.banner { margin: 20rpx; background: linear-gradient(135deg, #c8f7dc, #e6fff1); border-radius: 30rpx; padding: 30rpx; display: flex; align-items: center; justify-content: space-between; }
.banner-title { font-size: 48rpx; font-weight: bold; color: #222; }
.banner-sub { margin-top: 20rpx; color: #666; font-size: 28rpx; }
.publish-btn { margin-top: 30rpx; background: #36c66d; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.banner-img { width: 220rpx; height: 220rpx; }
.menu-grid { background: #fff; margin: 20rpx; border-radius: 25rpx; padding: 30rpx 0; display: flex; justify-content: space-around; }
.menu-item { display: flex; flex-direction: column; align-items: center; font-size: 26rpx; color: #333; }
.menu-icon { width: 90rpx; height: 90rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; margin-bottom: 10rpx; }
.blue   { background: #e8f3ff; }
.green  { background: #e8fff0; }
.orange { background: #fff3e5; }
.cyan   { background: #e8fbff; }
.section { margin: 20rpx; }
.section-header { display: flex; justify-content: space-between; margin-bottom: 20rpx; }
.title { font-size: 34rpx; font-weight: bold; }
.more { color: #999; font-size: 26rpx; }
.route-scroll { white-space: nowrap; }
.route-card { width: 260rpx; display: inline-block; background: #fff; padding: 25rpx; border-radius: 25rpx; margin-right: 20rpx; font-size: 28rpx; }
.route-card text { display: block; color: #999; margin-top: 15rpx; font-size: 24rpx; }
.active { background: #dff8ea; }
.trip-card { background: #fff; border-radius: 25rpx; padding: 25rpx; margin-bottom: 20rpx; display: flex; align-items: center; }
.avatar { width: 90rpx; height: 90rpx; border-radius: 50%; }
.trip-info { flex: 1; margin-left: 20rpx; }
.user-row { display: flex; align-items: center; }
.username { font-size: 30rpx; font-weight: bold; }
.tag { margin-left: 15rpx; background: #e8fff0; color: #36c66d; padding: 4rpx 12rpx; border-radius: 20rpx; font-size: 22rpx; }
.route { margin-top: 12rpx; font-size: 30rpx; color: #333; }
.time { margin-top: 10rpx; color: #999; font-size: 24rpx; }
.trip-right { display: flex; flex-direction: column; align-items: center; }
.seat { color: #ff8c00; font-weight: bold; margin-bottom: 15rpx; }
.join-btn { background: #36c66d; color: #fff; border-radius: 40rpx; font-size: 24rpx; padding: 0 25rpx; }
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; height: 120rpx; background: #fff; display: flex; align-items: center; justify-content: space-around; border-top: 1rpx solid #eee; }
.tab-item { display: flex; flex-direction: column; align-items: center; font-size: 22rpx; color: #888; }
.active-tab { color: #36c66d; }
.publish-center { width: 100rpx; height: 100rpx; background: #36c66d; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 50rpx; margin-top: -40rpx; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 999; }
.modal-box { background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 24rpx 32rpx 60rpx; width: 100%; }
.modal-handle { width: 72rpx; height: 8rpx; background: #e5e7eb; border-radius: 4rpx; margin: 0 auto 28rpx; }
.modal-title { font-size: 34rpx; font-weight: bold; color: #111; margin-bottom: 10rpx; }
.modal-desc { font-size: 24rpx; color: #999; margin-bottom: 30rpx; }
.modal-label { font-size: 26rpx; color: #555; margin-bottom: 12rpx; }
.modal-textarea { width: 100%; border: 1rpx solid #e5e7eb; border-radius: 20rpx; padding: 20rpx; font-size: 26rpx; color: #333; background: #fafafa; height: 160rpx; box-sizing: border-box; }
.modal-footer { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-cancel { flex: 1; border: 1rpx solid #e5e7eb; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 28rpx; color: #555; background: transparent; text-align: center; }
.btn-confirm { flex: 2; border: none; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 28rpx; font-weight: 500; background: #36c66d; color: #fff; text-align: center; }
.btn-confirm[disabled] { background: #a8e6c1; }
.loading-text, .empty-text { text-align: center; padding: 60rpx 0; color: #999; font-size: 28rpx; }

/* WebSocket 测试区域样式 - 新增 */
.ws-test-card {
  background: #fff;
  border-radius: 25rpx;
  padding: 25rpx;
}
.ws-status {
  font-size: 28rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}
.status-connected {
  color: #36c66d;
  font-weight: bold;
}
.status-disconnected {
  color: #ff6b6b;
  font-weight: bold;
}
.ws-message-list {
  margin-top: 20rpx;
  max-height: 300rpx;
  overflow-y: auto;
}
.ws-message-title {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 10rpx;
}
.ws-message {
  background: #f5f7fb;
  padding: 15rpx;
  border-radius: 12rpx;
  margin-bottom: 10rpx;
}
.ws-msg-time {
  font-size: 22rpx;
  color: #999;
  margin-right: 15rpx;
}
.ws-msg-content {
  font-size: 26rpx;
  color: #333;
}
.ws-test-btn {
  margin-top: 20rpx;
  background: #36c66d;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  padding: 20rpx;
}
.ws-test-btn[disabled] {
  background: #ccc;
}
</style>
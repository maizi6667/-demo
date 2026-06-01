<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">←</view>
      <view class="header-text">
        <text class="title">{{ pageTitle }}</text>
        <text class="subtitle">{{ pageSubtitle }}</text>
      </view>
      <view class="status-pill" :class="statusClass">{{ statusText }}</view>
    </view>

    <scroll-view class="content" scroll-y>

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
          <view class="meta-item" v-if="isDriver">
            <text class="meta-label">座位数</text>
            <text class="meta-value">{{ routeDetail.seatCount || '-' }}</text>
          </view>
          <view class="meta-item" v-if="!isDriver">
            <text class="meta-label">司机</text>
            <text class="meta-value">{{ routeDetail.driverName || driverName || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 司机视角 -->
      <block v-if="isDriver">
        <view class="card message-card">
          <view class="card-label">
            <text class="label-icon">📢</text>
            <text>通知内容</text>
          </view>
          <view class="action-type-bar">
            <view class="action-tab" :class="{ active: actionType === 'departure' }" @click="actionType = 'departure'">🚗 确认出发</view>
            <view class="action-tab" :class="{ active: actionType === 'arrival' }" @click="actionType = 'arrival'">📍 确认到达</view>
          </view>
          <textarea v-model="messageText" class="textarea" :placeholder="messagePlaceholder" :maxlength="120" />
          <view class="char-count">{{ messageText.length }}/120</view>
          <view class="tips">确认后将向所有乘客发送站内通知，并更新行程状态。</view>
        </view>

        <view class="card log-card">
          <view class="card-label">📋 操作日志</view>
          <view v-if="logs.length === 0" class="empty-log">暂无记录</view>
          <view v-for="(item, index) in logs" :key="index" class="log-item">
            <view class="log-dot" :class="item.type || 'info'"></view>
            <view class="log-body">
              <text class="log-text">{{ item.text }}</text>
              <text class="log-time">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </block>

      <!-- 乘客视角 -->
      <block v-else>
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

    </scroll-view>

    <view class="footer" v-if="isDriver">
      <button class="btn ghost" :disabled="sending" @click="saveDraft">保存草稿</button>
      <button class="btn primary" :disabled="sending || locked" @click="openConfirm">{{ buttonText }}</button>
    </view>

    <view class="footer" v-else-if="canBoard && !boardingConfirmed">
      <button class="btn primary full" :disabled="sending" @click="confirmBoarding">✅ 确认上车</button>
    </view>

    <view v-if="showConfirm" class="mask" @click="closeConfirm">
      <view class="dialog" @click.stop>
        <view class="dialog-title">{{ pageTitle }}</view>
        <view class="dialog-desc">{{ confirmDesc }}</view>
        <view class="dialog-preview">
          <text class="preview-label">通知内容预览</text>
          <text class="preview-msg">{{ messageText }}</text>
        </view>
        <view class="dialog-actions">
          <button class="dialog-btn cancel" @click="closeConfirm">取消</button>
          <button class="dialog-btn confirm" @click="confirmAction">发送并确认</button>
        </view>
      </view>
    </view>

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

export default {
  data() {
    return {
      isDriver: false,
      tripId: null,
      actionType: 'departure',
      startPlace: '',
      endPlace: '',
      driverName: '',
      routeDetail: {},
      messageText: '',
      sending: false,
      loading: false,
      showConfirm: false,
      logs: [],
      notices: [],
      canBoard: false,
      boardingConfirmed: false
    }
  },

  computed: {
    pageTitle() {
      if (this.isDriver) return this.actionType === 'arrival' ? '确认到达' : '确认出发'
      return '行程通知'
    },
    pageSubtitle() {
      if (this.isDriver) {
        return this.actionType === 'arrival' ? '行程即将到达目的地时使用此功能。' : '司机准备发车时使用此功能。'
      }
      return '查看司机发送的出发和到达通知。'
    },
    messagePlaceholder() {
      return this.actionType === 'arrival' ? '例如：我们已经到达，请携带好随身物品。' : '例如：我们现在出发，请做好准备。'
    },
    confirmDesc() {
      return this.actionType === 'arrival' ? '此操作将标记行程为"已到达"，并通知所有乘客。' : '此操作将标记行程为"已出发"，并通知所有乘客。'
    },
    statusText() {
      const map = { 1: '待出发', 2: '已满员', 3: '已取消', 4: '已出发', 5: '已到达' }
      return map[this.routeDetail.status] || '等待中'
    },
    statusClass() {
      const map = { 1: 'pending', 2: 'full', 3: 'canceled', 4: 'departed', 5: 'arrived' }
      return map[this.routeDetail.status] || 'pending'
    },
    locked() {
      const status = Number(this.routeDetail.status || 1)
      if (this.actionType === 'arrival') return status >= 5 || status < 4
      return status >= 4
    },
    buttonText() {
      if (this.locked) return this.actionType === 'arrival' ? '已到达' : '已出发'
      return this.actionType === 'arrival' ? '确认到达并通知乘客' : '确认出发并通知乘客'
    }
  },

  onLoad(options) {
    // ✅ userInfo 只声明一次
    const userInfo = uni.getStorageSync('userInfo') || {}
    this.isDriver = userInfo.userType === 1 || userInfo.role === 'driver'

    this.tripId     = options.tripId     ? Number(options.tripId) : null
    this.actionType = options.actionType === 'arrival' ? 'arrival' : 'departure'
    this.startPlace = options.startPlace ? decodeURIComponent(options.startPlace) : ''
    this.endPlace   = options.endPlace   ? decodeURIComponent(options.endPlace)   : ''
    this.driverName = options.driverName ? decodeURIComponent(options.driverName) : ''

    // 如果路由里直接传了起终点，先填入 routeDetail 供页面先渲染
    if (this.startPlace || this.endPlace) {
      this.routeDetail = {
        startPlace: this.startPlace,
        endPlace: this.endPlace,
        driverName: this.driverName
      }
    }

    if (this.isDriver) {
      this.messageText = uni.getStorageSync(this.draftKey()) || this.defaultMessage()
    }

    console.log('详情页参数 tripId:', this.tripId, 'isDriver:', this.isDriver)
    this.loadData()
  },

  methods: {
    draftKey() {
      return `driver_notify_draft_${this.actionType}_${this.tripId || 'default'}`
    },
    defaultMessage() {
      return this.actionType === 'arrival' ? '我们已经到达目的地。' : '我们现在出发。'
    },

    async loadData() {
      // 没有 tripId 时用路由传参的数据直接展示，不发请求
      if (!this.tripId) {
        console.warn('没有 tripId，使用路由传参数据展示')
        return
      }
      this.loading = true
      try {
        await this.loadRouteDetail()
        if (!this.isDriver) {
          await this.loadNotices()
        }
      } finally {
        this.loading = false
      }
    },

    async loadRouteDetail() {
      try {
        const res = await request({
          url: `/carpool/routes/getByTripId/${this.tripId}`,
          method: 'GET'
        })
        console.log('路线详情返回:', res)
        const data = (res && res.code !== undefined) ? res.data : res
        if (data) this.routeDetail = data
      } catch (err) {
        console.error('加载路线详情失败', err)
      }
    },

    async loadNotices() {
      try {
        const res = await request({
          url: '/user/trip/notice/list',
          method: 'GET',
          data: { tripId: this.tripId }
        })
        const data = (res && res.code !== undefined) ? res.data : res
        if (data) {
          this.notices = Array.isArray(data) ? data : (data.list || [])
          this.canBoard = this.notices.some(n => n.actionType === 'departure')
          this.boardingConfirmed = data.boardingConfirmed || false
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
            const success = res && (res.code === 0 || res.code === 200)
            if (success) {
              this.boardingConfirmed = true
              uni.showToast({ title: '已确认上车', icon: 'success' })
            } else {
              uni.showToast({ title: (res && res.msg) || '操作失败', icon: 'none' })
            }
          } catch (err) {
            uni.showToast({ title: '网络异常', icon: 'none' })
          } finally {
            this.sending = false
          }
        }
      })
    },

    openConfirm() {
      if (this.locked) return
      if (!this.messageText.trim()) {
        uni.showToast({ title: '请填写通知内容', icon: 'none' })
        return
      }
      this.showConfirm = true
    },
    closeConfirm() {
      if (this.sending) return
      this.showConfirm = false
    },
    saveDraft() {
      uni.setStorageSync(this.draftKey(), this.messageText)
      uni.showToast({ title: '草稿已保存', icon: 'success' })
    },

    async confirmAction() {
      if (this.sending || this.locked) return
      if (!this.tripId) {
        uni.showToast({ title: '缺少行程ID', icon: 'none' })
        return
      }
      const url = this.actionType === 'arrival' ? '/trip/driver/confirm-arrival' : '/trip/driver/confirm-departure'
      this.sending = true
      this.showConfirm = false
      try {
        const res = await request({
          url,
          method: 'POST',
          data: { tripId: this.tripId, message: this.messageText.trim(), confirmTime: Date.now() }
        })
        const success = res && (res.code === 0 || res.code === 200)
        if (success) {
          const resData = (res && res.code !== undefined) ? res.data : res
          const status = resData?.status ?? (this.actionType === 'arrival' ? 5 : 4)
          this.routeDetail = { ...this.routeDetail, status }
          this.logs.unshift({ time: this.formatNow(), text: `${this.pageTitle}成功，通知已发送给所有乘客`, type: 'success' })
          uni.removeStorageSync(this.draftKey())
          uni.showToast({ title: '操作成功，通知已发送', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } else {
          const msg = (res && res.msg) || '操作失败'
          uni.showToast({ title: msg, icon: 'none' })
          this.logs.unshift({ time: this.formatNow(), text: `操作失败：${msg}`, type: 'error' })
        }
      } catch (err) {
        console.error(err)
        this.logs.unshift({ time: this.formatNow(), text: '提交失败，请重试', type: 'error' })
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.sending = false
      }
    },

    formatDateTime(value) {
      if (!value) return '-'
      const d = new Date(value)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    formatNow() { return this.formatDateTime(Date.now()) },
    goBack() { uni.navigateBack() }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #111827 26%, #f1f5f9 26%, #f1f5f9 100%);
}
.header {
  display: flex; align-items: flex-start; gap: 18rpx;
  padding: 30rpx 28rpx 26rpx; color: #fff;
}
.back-btn {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.12); font-size: 40rpx; flex-shrink: 0;
}
.header-text { flex: 1; }
.title { display: block; font-size: 38rpx; font-weight: 800; }
.subtitle { display: block; margin-top: 8rpx; font-size: 24rpx; color: rgba(255,255,255,0.66); line-height: 1.5; }
.status-pill { padding: 10rpx 18rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 600; }
.status-pill.pending  { background: rgba(250,204,21,0.16); color: #fbbf24; }
.status-pill.full     { background: rgba(96,165,250,0.16); color: #93c5fd; }
.status-pill.canceled { background: rgba(248,113,113,0.16); color: #fca5a5; }
.status-pill.departed { background: rgba(34,197,94,0.16); color: #4ade80; }
.status-pill.arrived  { background: rgba(14,165,233,0.16); color: #7dd3fc; }
.content { height: calc(100vh - 220rpx); padding: 0 28rpx 160rpx; box-sizing: border-box; }
.card { background: #fff; border-radius: 28rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05); }
.card-label { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 20rpx; display: flex; align-items: center; gap: 10rpx; }
.label-icon { font-size: 32rpx; }
.route-line { display: flex; align-items: center; gap: 16rpx; }
.route-arrow { margin: 8rpx 0 8rpx 7rpx; color: #94a3b8; font-size: 28rpx; }
.dot { width: 18rpx; height: 18rpx; border-radius: 50%; flex-shrink: 0; }
.dot.start { background: #22c55e; box-shadow: 0 0 0 4rpx #bbf7d0; }
.dot.end   { background: #ef4444; box-shadow: 0 0 0 4rpx #fecaca; }
.route-text { font-size: 30rpx; font-weight: 600; color: #0f172a; }
.route-meta { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f1f5f9; }
.meta-item { flex: 1; min-width: 200rpx; }
.meta-label { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 6rpx; }
.meta-value { display: block; font-size: 28rpx; color: #0f172a; font-weight: 600; }
.action-type-bar { display: flex; background: #f1f5f9; border-radius: 999rpx; padding: 6rpx; margin-bottom: 20rpx; gap: 8rpx; }
.action-tab { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 999rpx; font-size: 26rpx; color: #64748b; }
.action-tab.active { background: #fff; color: #0f172a; font-weight: 700; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08); }
.textarea { width: 100%; min-height: 160rpx; background: #f8fafc; border-radius: 20rpx; padding: 20rpx; box-sizing: border-box; font-size: 28rpx; color: #0f172a; line-height: 1.6; }
.char-count { text-align: right; font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; }
.tips { margin-top: 12rpx; font-size: 22rpx; color: #94a3b8; line-height: 1.6; }
.empty-log { color: #94a3b8; font-size: 24rpx; }
.log-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 14rpx 0; border-bottom: 1rpx solid #f8fafc; }
.log-item:last-child { border-bottom: none; }
.log-dot { width: 16rpx; height: 16rpx; border-radius: 50%; margin-top: 8rpx; flex-shrink: 0; }
.log-dot.success { background: #22c55e; }
.log-dot.error   { background: #ef4444; }
.log-dot.info    { background: #94a3b8; }
.log-body { flex: 1; }
.log-text { display: block; font-size: 26rpx; color: #334155; line-height: 1.5; }
.log-time { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 6rpx; }
.empty-notice { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; gap: 16rpx; }
.empty-icon { font-size: 72rpx; }
.empty-text { font-size: 30rpx; font-weight: 600; color: #1e293b; }
.empty-sub  { font-size: 24rpx; color: #94a3b8; text-align: center; line-height: 1.6; }
.notice-item { display: flex; align-items: flex-start; gap: 20rpx; padding: 20rpx 0; border-bottom: 1rpx solid #f1f5f9; position: relative; }
.notice-item:last-child { border-bottom: none; }
.notice-item.unread { background: #f0f9ff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 8rpx; }
.notice-badge { padding: 8rpx 18rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 700; flex-shrink: 0; }
.notice-badge.departed { background: #dcfce7; color: #15803d; }
.notice-badge.arrived  { background: #dbeafe; color: #1e40af; }
.notice-content { flex: 1; }
.notice-msg  { display: block; font-size: 28rpx; color: #1e293b; line-height: 1.5; margin-bottom: 8rpx; }
.notice-time { display: block; font-size: 22rpx; color: #94a3b8; }
.unread-dot { width: 16rpx; height: 16rpx; background: #3b82f6; border-radius: 50%; position: absolute; top: 20rpx; right: 0; }
.boarding-card { background: #f0fdf4; border: 1rpx solid #bbf7d0; }
.boarding-hint { font-size: 26rpx; color: #15803d; margin-bottom: 16rpx; line-height: 1.5; }
.boarding-status { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx; background: #dcfce7; border-radius: 16rpx; }
.confirmed-icon { font-size: 32rpx; color: #16a34a; font-weight: 700; }
.confirmed-text { font-size: 28rpx; color: #15803d; font-weight: 600; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 16rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.94); backdrop-filter: blur(20px); border-top: 1rpx solid #e2e8f0; }
.btn { flex: 1; height: 92rpx; line-height: 92rpx; border-radius: 999rpx; font-size: 28rpx; font-weight: 600; border: none; }
.btn.primary { background: linear-gradient(135deg, #0f2b3d, #1e4a6e); color: #fff; }
.btn.ghost   { background: #e2e8f0; color: #334155; }
.btn.full    { flex: none; width: 100%; }
.btn[disabled] { opacity: 0.5; }
.mask { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: flex-end; z-index: 999; }
.dialog { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 28rpx calc(32rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.dialog-title { font-size: 34rpx; font-weight: 800; color: #0f172a; }
.dialog-desc  { margin-top: 12rpx; font-size: 24rpx; color: #64748b; line-height: 1.6; }
.dialog-preview { margin-top: 20rpx; background: #f8fafc; border-left: 6rpx solid #3b82f6; padding: 20rpx; border-radius: 0 16rpx 16rpx 0; }
.preview-label { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 8rpx; }
.preview-msg   { display: block; font-size: 28rpx; color: #334155; line-height: 1.6; }
.dialog-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.dialog-btn { flex: 1; height: 88rpx; line-height: 88rpx; border-radius: 999rpx; font-size: 28rpx; border: none; }
.dialog-btn.cancel  { background: #e2e8f0; color: #334155; }
.dialog-btn.confirm { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-weight: 700; }
.loading-mask { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.loading-box { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 32rpx 48rpx; border-radius: 28rpx; background: rgba(255,255,255,0.96); font-size: 26rpx; color: #1e293b; }
.loading-spinner { width: 48rpx; height: 48rpx; border: 4rpx solid #e2e8f0; border-top-color: #1e4a6e; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
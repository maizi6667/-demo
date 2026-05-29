<template>
  <view class="page">
    <view class="hero">
      <view class="hero-top">
        <view>
          <text class="title">上车确认</text>
          <text class="subtitle">司机确认乘客已上车后，自动发送出发通知</text>
        </view>
        <view class="status-pill" :class="tripStatusClass">
          {{ tripStatusText }}
        </view>
      </view>

      <view class="route-card">
        <view class="route-line">
          <view class="dot start"></view>
          <text class="route-text">{{ trip.startPlace }}</text>
        </view>
        <view class="route-arrow">→</view>
        <view class="route-line">
          <view class="dot end"></view>
          <text class="route-text">{{ trip.endPlace }}</text>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="info-card">
        <view class="info-row">
          <text class="label">乘客</text>
          <text class="value">{{ trip.passengerName }}</text>
        </view>
        <view class="info-row">
          <text class="label">车牌</text>
          <text class="value">{{ trip.carNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">预计出发</text>
          <text class="value">{{ trip.departTimeText }}</text>
        </view>
        <view class="info-row">
          <text class="label">座位</text>
          <text class="value">{{ trip.seatCount }} 个</text>
        </view>
      </view>

      <view class="message-card">
        <view class="section-title">发送给乘客的消息</view>
        <textarea
          v-model="messageText"
          class="textarea"
          placeholder="请输入通知内容"
          :maxlength="120"
        />
        <view class="tips">确认后会自动把这条消息发给乘客</view>
      </view>

      <view class="timeline-card">
        <view class="section-title">操作记录</view>
        <view v-if="logs.length === 0" class="empty-log">暂无记录</view>
        <view v-for="(item, index) in logs" :key="index" class="log-item">
          <text class="log-time">{{ item.time }}</text>
          <text class="log-text">{{ item.text }}</text>
        </view>
      </view>
    </view>

    <view class="footer">
      <button class="ghost-btn" :disabled="sending" @click="saveDraft">
        保存消息
      </button>
      <button
        class="primary-btn"
        :disabled="sending || confirmed"
        @click="openConfirm"
      >
        {{ sending ? '发送中...' : confirmed ? '已确认出发' : '确认上车并出发' }}
      </button>
    </view>

    <view v-if="showConfirm" class="mask" @click="closeConfirm">
      <view class="dialog" @click.stop>
        <view class="dialog-title">确认出发？</view>
        <view class="dialog-desc">
          确认后会向乘客发送出发通知，并把当前订单状态改为“已出发”。
        </view>
        <view class="dialog-msg">{{ messageText }}</view>
        <view class="dialog-actions">
          <button class="cancel-btn" @click="closeConfirm">取消</button>
          <button class="confirm-btn" @click="confirmDeparture">确认发送</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      sending: false,
      confirmed: false,
      showConfirm: false,
      trip: {
        id: '',
        startPlace: '南京南站',
        endPlace: '上海虹桥站',
        passengerName: '张三',
        carNo: '苏A12345',
        departTimeText: '2026-05-28 08:30',
        seatCount: 1
      },
      messageText: '司机已确认您上车，车辆已出发，请您留意行程动态。',
      logs: []
    }
  },
  computed: {
    tripStatusText() {
      if (this.confirmed) return '已出发'
      if (this.sending) return '发送中'
      return '待确认'
    },
    tripStatusClass() {
      if (this.confirmed) return 'done'
      if (this.sending) return 'active'
      return 'pending'
    }
  },
  onLoad(options) {
    if (options.tripId) {
      this.trip.id = options.tripId
    }
    if (options.passengerName) this.trip.passengerName = decodeURIComponent(options.passengerName)
    if (options.startPlace) this.trip.startPlace = decodeURIComponent(options.startPlace)
    if (options.endPlace) this.trip.endPlace = decodeURIComponent(options.endPlace)
  },
  methods: {
    openConfirm() {
      if (!this.messageText.trim()) {
        uni.showToast({ title: '请先填写通知内容', icon: 'none' })
        return
      }
      this.showConfirm = true
    },
    closeConfirm() {
      if (this.sending) return
      this.showConfirm = false
    },
    saveDraft() {
      uni.setStorageSync('driver_notify_draft', this.messageText)
      uni.showToast({ title: '已保存', icon: 'success' })
    },
    async confirmDeparture() {
      if (this.sending || this.confirmed) return
      this.sending = true
      this.showConfirm = false

      const now = new Date()
      const time = this.formatTime(now)
      try {
        const res = await request({
          url: '/trip/driver/confirm-departure',
          method: 'POST',
          data: {
            tripId: this.trip.id,
            message: this.messageText.trim(),
            confirmTime: now.getTime()
          }
        })

        this.confirmed = true
        this.logs.unshift({
          time,
          text: '司机已确认上车并发送通知'
        })

        uni.showToast({ title: '已发送乘客通知', icon: 'success' })

        // 如果后端返回了最新状态，可以在这里替换本地展示
        if (res?.data?.status !== undefined) {
          this.logs.unshift({
            time,
            text: `订单状态更新为：${res.data.status}`
          })
        }
      } catch (err) {
        console.error('confirm departure failed:', err)
        this.logs.unshift({
          time,
          text: '发送失败，请稍后重试'
        })
        uni.showToast({ title: err?.msg || '发送失败，请重试', icon: 'none' })
      } finally {
        this.sending = false
      }
    },
    formatTime(date) {
      const pad = n => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #111827 30%, #f3f4f6 30%, #f3f4f6 100%);
  padding-bottom: 160rpx;
}

.hero {
  padding: 32rpx 28rpx 36rpx;
  color: #fff;
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.status-pill {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.status-pill.pending { background: rgba(250, 204, 21, 0.15); color: #fbbf24; }
.status-pill.active { background: rgba(59, 130, 246, 0.18); color: #60a5fa; }
.status-pill.done { background: rgba(34, 197, 94, 0.18); color: #4ade80; }

.route-card {
  margin-top: 28rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 28rpx;
  padding: 28rpx;
}

.route-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.route-arrow {
  margin: 12rpx 0 12rpx 28rpx;
  color: rgba(255, 255, 255, 0.55);
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
}

.dot.start { background: #4ade80; }
.dot.end { background: #fb7185; }

.route-text {
  font-size: 30rpx;
  font-weight: 600;
}

.content {
  padding: 0 28rpx;
}

.info-card,
.message-card,
.timeline-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.label {
  color: #64748b;
  font-size: 26rpx;
}

.value {
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 600;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20rpx;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  background: #f8fafc;
  border-radius: 20rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #0f172a;
}

.tips {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.empty-log {
  color: #94a3b8;
  font-size: 24rpx;
}

.log-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8fafc;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-bottom: 6rpx;
}

.log-text {
  display: block;
  font-size: 26rpx;
  color: #334155;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20rpx);
  border-top: 1rpx solid #e2e8f0;
}

.ghost-btn,
.primary-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  border: none;
}

.ghost-btn {
  background: #e2e8f0;
  color: #334155;
}

.primary-btn {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  font-weight: 700;
}

.primary-btn[disabled],
.ghost-btn[disabled] {
  opacity: 0.6;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.dialog {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx;
  box-sizing: border-box;
}

.dialog-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.dialog-desc {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.6;
}

.dialog-msg {
  margin-top: 20rpx;
  background: #f8fafc;
  padding: 20rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #334155;
}

.dialog-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  font-size: 28rpx;
  border: none;
}

.cancel-btn {
  background: #e2e8f0;
  color: #334155;
}

.confirm-btn {
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  color: #fff;
  font-weight: 700;
}
</style>

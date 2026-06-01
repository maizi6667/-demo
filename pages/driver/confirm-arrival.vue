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
        <view class="card-title">当前行程</view>
        <view class="route-line">
          <view class="dot start"></view>
          <text class="route-text">{{ routeDetail.startPlace || startPlace || '未设置出发地' }}</text>
        </view>
        <view class="route-arrow">→</view>
        <view class="route-line">
          <view class="dot end"></view>
          <text class="route-text">{{ routeDetail.endPlace || endPlace || '未设置目的地' }}</text>
        </view>
      </view>

      <view class="card info-card">
        <view class="card-title">操作信息</view>
        <view class="info-row">
          <text class="label">司机</text>
          <text class="value">{{ driverName || routeDetail.userName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">行程ID</text>
          <text class="value">{{ tripId || routeDetail.tripId || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">出发时间</text>
          <text class="value">{{ formatDateTime(routeDetail.departTime) }}</text>
        </view>
        <view class="info-row">
          <text class="label">座位数</text>
          <text class="value">{{ routeDetail.seatCount || '-' }}</text>
        </view>
      </view>

      <view class="card message-card">
        <view class="card-title">给乘客的留言</view>
        <textarea
          v-model="messageText"
          class="textarea"
          :placeholder="messagePlaceholder"
          :maxlength="120"
        />
        <view class="tips">确认操作后行程状态会更新，并保留本地草稿。</view>
      </view>

      <view class="card log-card">
        <view class="card-title">本地日志</view>
        <view v-if="logs.length === 0" class="empty-log">暂无日志</view>
        <view v-for="(item, index) in logs" :key="index" class="log-item">
          <text class="log-time">{{ item.time }}</text>
          <text class="log-text">{{ item.text }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <button class="btn ghost" :disabled="sending" @click="saveDraft">保存草稿</button>
      <button class="btn primary" :disabled="sending || locked" @click="openConfirm">
        {{ buttonText }}
      </button>
    </view>

    <view v-if="showConfirm" class="mask" @click="closeConfirm">
      <view class="dialog" @click.stop>
        <view class="dialog-title">{{ pageTitle }}</view>
        <view class="dialog-desc">{{ confirmDesc }}</view>
        <view class="dialog-msg">{{ messageText }}</view>
        <view class="dialog-actions">
          <button class="dialog-btn cancel" @click="closeConfirm">取消</button>
          <button class="dialog-btn confirm" @click="confirmAction">确认</button>
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
      tripId: null,
      actionType: 'departure',
      startPlace: '',
      endPlace: '',
      driverName: '',
      routeDetail: {},
      messageText: '',
      sending: false,
      showConfirm: false,
      logs: []
    }
  },
  computed: {
    pageTitle() {
      return this.actionType === 'arrival' ? '确认到达' : '确认出发'
    },
    pageSubtitle() {
      return this.actionType === 'arrival'
        ? '行程即将到达目的地时使用此功能。'
        : '司机准备发车时使用此功能。'
    },
    messagePlaceholder() {
      return this.actionType === 'arrival'
        ? '例如：我们已经到达，请携带好随身物品。'
        : '例如：我们现在出发，请做好准备。'
    },
    confirmDesc() {
      return this.actionType === 'arrival'
        ? '此操作将标记行程为“已到达”。'
        : '此操作将标记行程为“已出发”。'
    },
    statusText() {
      return this.statusTextByTripStatus(this.routeDetail.status)
    },
    statusClass() {
      return this.statusClassByTripStatus(this.routeDetail.status)
    },
    locked() {
      const status = Number(this.routeDetail.status || 1)
      if (this.actionType === 'arrival') {
        return status >= 5 || status < 4
      }
      return status >= 4
    },
    buttonText() {
      if (this.locked) {
        return this.actionType === 'arrival' ? '已到达' : '已出发'
      }
      return this.actionType === 'arrival' ? '确认到达' : '确认出发'
    }
  },
  onLoad(options) {
    this.tripId = options.tripId ? Number(options.tripId) : null
    this.actionType = options.actionType === 'arrival' ? 'arrival' : 'departure'
    this.startPlace = options.startPlace ? decodeURIComponent(options.startPlace) : ''
    this.endPlace = options.endPlace ? decodeURIComponent(options.endPlace) : ''
    this.driverName = options.driverName ? decodeURIComponent(options.driverName) : ''
    this.messageText = uni.getStorageSync(this.draftKey()) || this.defaultMessage()
    this.loadRouteDetail()
  },
  methods: {
    draftKey() {
      return `driver_notify_draft_${this.actionType}_${this.tripId || 'default'}`
    },
    defaultMessage() {
      return this.actionType === 'arrival'
        ? '我们已经到达目的地。'
        : '我们现在出发。'
    },
    async loadRouteDetail() {
      if (!this.tripId) return
      try {
        const res = await request({
          url: `/carpool/routes/getByTripId/${this.tripId}`,
          method: 'GET'
        })
        this.routeDetail = res.data || {}
      } catch (err) {
        console.error('加载路线详情失败', err)
      }
    },
    openConfirm() {
      if (this.locked) return
      if (!this.messageText.trim()) {
        uni.showToast({ title: '请填写留言', icon: 'none' })
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

      const url = this.actionType === 'arrival'
        ? '/trip/driver/confirm-arrival'
        : '/trip/driver/confirm-departure'

      this.sending = true
      this.showConfirm = false

      try {
        const res = await request({
          url,
          method: 'POST',
          data: {
            tripId: this.tripId,
            message: this.messageText.trim(),
            confirmTime: Date.now()
          }
        })

        if (res.code === 0) {
          const status = res.data?.status ?? (this.actionType === 'arrival' ? 5 : 4)
          this.routeDetail.status = status
          this.logs.unshift({
            time: this.formatNow(),
            text: `${this.pageTitle}成功，状态更新为${this.statusTextByTripStatus(status)}`
          })
          uni.removeStorageSync(this.draftKey())
          uni.showToast({ title: '操作成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      } catch (err) {
        console.error('确认操作失败', err)
        this.logs.unshift({
          time: this.formatNow(),
          text: '提交失败，请重试'
        })
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.sending = false
      }
    },
    statusTextByTripStatus(status) {
      const map = {
        1: '待出发',
        2: '已满员',
        3: '已取消',
        4: '已出发',
        5: '已到达'
      }
      return map[status] || '等待中'
    },
    statusClassByTripStatus(status) {
      const map = {
        1: 'pending',
        2: 'full',
        3: 'canceled',
        4: 'departed',
        5: 'arrived'
      }
      return map[status] || 'pending'
    },
    formatDateTime(value) {
      if (!value) return '-'
      const d = new Date(value)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    formatNow() {
      return this.formatDateTime(Date.now())
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #111827 26%, #f8fafc 26%, #f8fafc 100%);
}

.header {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 30rpx 28rpx 26rpx;
  color: #fff;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  font-size: 40rpx;
  flex-shrink: 0;
}

.header-text {
  flex: 1;
}

.title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.5;
}

.status-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.status-pill.pending { background: rgba(250, 204, 21, 0.16); color: #fbbf24; }
.status-pill.full { background: rgba(96, 165, 250, 0.16); color: #93c5fd; }
.status-pill.canceled { background: rgba(248, 113, 113, 0.16); color: #fca5a5; }
.status-pill.departed { background: rgba(34, 197, 94, 0.16); color: #4ade80; }
.status-pill.arrived { background: rgba(14, 165, 233, 0.16); color: #7dd3fc; }

.content {
  height: calc(100vh - 220rpx);
  padding: 0 28rpx 160rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
}

.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20rpx;
}

.route-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.route-arrow {
  margin: 12rpx 0 12rpx 28rpx;
  color: #94a3b8;
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
}

.dot.start { background: #4ade80; }
.dot.end { background: #f87171; }

.route-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #64748b;
  font-size: 26rpx;
}

.value {
  color: #0f172a;
  font-size: 26rpx;
  text-align: right;
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
  line-height: 1.6;
}

.empty-log {
  color: #94a3b8;
  font-size: 24rpx;
}

.log-item {
  padding: 14rpx 0;
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
  line-height: 1.6;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1rpx solid #e2e8f0;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  border: none;
}

.btn.primary {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  font-weight: 700;
}

.btn.ghost {
  background: #e2e8f0;
  color: #334155;
}

.btn[disabled] {
  opacity: 0.55;
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
  line-height: 1.6;
}

.dialog-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.dialog-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  border: none;
}

.dialog-btn.cancel {
  background: #e2e8f0;
  color: #334155;
}

.dialog-btn.confirm {
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  color: #fff;
  font-weight: 700;
}
</style>

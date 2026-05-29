<template>
  <view class="container">
    <!-- 顶部统计卡片 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-value income">¥{{ totalIncome.toFixed(2) }}</text>
        <text class="stat-label">司机总收益</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value spend">¥{{ totalSpend.toFixed(2) }}</text>
        <text class="stat-label">乘客总花费</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-value trips">{{ driverTrips.length + consumerTrips.length }}</text>
        <text class="stat-label">总行程数</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: activeTab === 'driver' }" @click="activeTab = 'driver'">
        <text class="tab-icon">🚗</text>
        <text class="tab-text">我是司机</text>
        <view class="tab-badge" v-if="driverTrips.length > 0">{{ driverTrips.length }}</view>
      </view>
      <view class="tab-item" :class="{ active: activeTab === 'consumer' }" @click="activeTab = 'consumer'">
        <text class="tab-icon">🧍</text>
        <text class="tab-text">我是乘客</text>
        <view class="tab-badge" v-if="consumerTrips.length > 0">{{ consumerTrips.length }}</view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <scroll-view class="filter-tags" scroll-x>
      <view class="tag-item" :class="{ active: activeTag === index }" v-for="(tag, index) in filterTags" :key="index" @click="selectTag(index, tag.value)">
        {{ tag.name }}
      </view>
    </scroll-view>

    <!-- 行程列表 -->
    <scroll-view class="trip-scroll" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <!-- 司机行程 -->
      <block v-if="activeTab === 'driver'">
        <view v-if="!loading && driverTrips.length === 0" class="empty-state">
          <text class="empty-icon">🚗</text>
          <text class="empty-title">暂无司机行程</text>
          <button class="empty-btn" @click="goToPublish">发布行程</button>
        </view>
        <view v-else class="trip-items">
          <view class="trip-card driver-card" v-for="(item, idx) in driverTrips" :key="item.userGetMyTripList.id">
            <view class="card-header">
              <view class="role-badge driver-badge"><text>🚗 司机</text></view>
              <view class="trip-status" :class="item.statusClass">{{ item.statusText }}</view>
            </view>
            <view class="route-section">
              <view class="route-row"><view class="dot green-dot"></view><text class="route-place">{{ item.userGetMyTripList.startPlace }}</text></view>
              <view class="route-connector"><view class="connector-line"></view><text class="connector-arrow">↓</text></view>
              <view class="route-row"><view class="dot red-dot"></view><text class="route-place">{{ item.userGetMyTripList.endPlace }}</text></view>
            </view>
            <view class="info-grid">
              <view class="info-cell"><text class="info-label">出发时间</text><text class="info-value">{{ formatDateTime(item.userGetMyTripList.departTime) }}</text></view>
              <view class="info-cell"><text class="info-label">座位数</text><text class="info-value">{{ item.userGetMyTripList.seatCount }} 座</text></view>
              <view class="info-cell"><text class="info-label">单价</text><text class="info-value">¥{{ item.userGetMyTripList.price }}/人</text></view>
              <view class="info-cell"><text class="info-label">已接乘客</text><text class="info-value highlight">{{ item.consumerList ? item.consumerList.length : 0 }} 人</text></view>
            </view>
            <view class="earning-bar">
              <view class="earning-left"><text class="earning-label">预计收益</text><text class="earning-amount income-color">¥{{ calcDriverEarning(item) }}</text></view>
              <view class="earning-right"><text class="earning-note">{{ item.consumerList && item.consumerList.length ? `已有 ${item.consumerList.length} 人报名` : '暂无乘客' }}</text></view>
            </view>
            
            <!-- 乘客列表 - 修复后版本 -->
            <!-- 乘客列表（可展开） -->
<view class="passenger-section" v-if="item.consumerList && item.consumerList.length > 0">
  <view class="section-toggle" @click="toggleDriverExpand(idx)">
    <text class="toggle-label">👥 乘客列表（{{ item.consumerList.length }}人）</text>
    <text class="toggle-arrow">{{ expandedDriverIndex === idx ? '▲' : '▼' }}</text>
  </view>
  <view class="passenger-list" v-if="expandedDriverIndex === idx">
    <view class="passenger-row" v-for="(consumer, ci) in item.consumerList" :key="consumer.id">
      <view class="p-avatar"><text>{{ ci + 1 }}</text></view>
      <view class="p-info">
        <!-- 修改这里：显示乘客名称而不是ID -->
        <text class="p-name">乘客: {{ consumer.username || '未知用户' }}</text>
        <text class="p-detail">乘坐 {{ consumer.seatCount || 1 }} 座 · 支付 ¥{{ consumer.price }}</text>
      </view>
      <view class="p-action" @click.stop="contactUser(consumer.userId)"><text>联系</text></view>
    </view>
  </view>
</view>
            <!-- 提示无乘客 -->
            <view class="passenger-section" v-else>
              <view class="no-passenger-tip">
                <text class="tip-icon">👥</text>
                <text class="tip-text">暂无乘客报名</text>
              </view>
            </view>
            
            <view class="card-actions">
              <button class="btn-secondary" @click.stop="evaluateTrip(item.userGetMyTripList)">评价</button>
              <button class="btn-primary" @click.stop="viewDetail(item.userGetMyTripList.id, 'driver')">详情</button>
            </view>
          </view>
        </view>
      </block>

      <!-- 乘客行程 -->
      <block v-if="activeTab === 'consumer'">
        <view v-if="!loading && consumerTrips.length === 0" class="empty-state">
          <text class="empty-icon">🧍</text>
          <text class="empty-title">暂无乘客行程</text>
          <button class="empty-btn" @click="goToSearch">找行程</button>
        </view>
        <view v-else class="trip-items">
          <view class="trip-card consumer-card" v-for="(item, idx) in consumerTrips" :key="item.consumer.id">
            <view class="card-header">
              <view class="role-badge consumer-badge"><text>🧍 乘客</text></view>
              <view class="trip-status" :class="item.consumerStatusClass">{{ item.consumerStatusText }}</view>
            </view>
            <view class="route-section">
              <view class="route-row"><view class="dot green-dot"></view><text class="route-place">{{ item.consumer.startPlace }}</text></view>
              <view class="route-connector"><view class="connector-line"></view><text class="connector-arrow">↓</text></view>
              <view class="route-row"><view class="dot red-dot"></view><text class="route-place">{{ item.consumer.endPlace }}</text></view>
            </view>
            <view class="info-grid">
              <view class="info-cell"><text class="info-label">出发时间</text><text class="info-value">{{ formatDateTime(item.consumer.departTime) }}</text></view>
              <view class="info-cell"><text class="info-label">座位数</text><text class="info-value">{{ item.consumer.seatCount }} 座</text></view>
              <view class="info-cell"><text class="info-label">费用</text><text class="info-value spend-color">¥{{ item.consumer.price }}</text></view>
              <view class="info-cell"><text class="info-label">司机</text><text class="info-value highlight">{{ item.driverVo ? item.driverVo.userName : '待分配' }}</text></view>
            </view>
            <view class="earning-bar">
              <view class="earning-left"><text class="earning-label">本次花费</text><text class="earning-amount spend-color">¥{{ calcConsumerSpend(item) }}</text></view>
              <view class="earning-right"><text class="earning-note">{{ item.driverVo ? '司机: ' + item.driverVo.userName : '等待司机接单' }}</text></view>
            </view>
            <!-- 乘客列表 - 显示用户名版本 -->
<view class="passenger-section" v-if="item.consumerList && item.consumerList.length > 0">
  <view class="section-toggle" @click="toggleDriverExpand(idx)">
    <text class="toggle-label">👥 乘客列表（{{ item.consumerList.length }}人）</text>
    <text class="toggle-arrow">{{ expandedDriverIndex === idx ? '▲' : '▼' }}</text>
  </view>
  <view class="passenger-list" v-if="expandedDriverIndex === idx">
    <view class="passenger-row" v-for="(consumer, ci) in item.consumerList" :key="consumer.id">
      <view class="p-avatar"><text>{{ ci + 1 }}</text></view>
      <view class="p-info">
        <text class="p-name">👤 {{ consumer.username || '乘客' }}</text>
        <text class="p-detail">🎫 {{ consumer.seatCount || 1 }} 座 · 💰 ¥{{ consumer.price }}</text>
      </view>
      <view class="p-action" @click.stop="contactUser(consumer.userId)"><text>💬 联系</text></view>
    </view>
  </view>
</view>
            <view class="card-actions">
              <button class="btn-secondary" @click.stop="evaluateTrip(item.consumer)">评价</button>
              <button class="btn-primary" @click.stop="viewDetail(item.consumer.tripUserTripId, 'consumer')">详情</button>
            </view>
          </view>
        </view>
      </block>

      <view v-if="loading" class="loading-tip"><text>加载中...</text></view>
    </scroll-view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      loading: false,
      refreshing: false,
      activeTab: 'driver',
      activeTag: 0,
      expandedDriverIndex: -1,
      expandedConsumerIndex: -1,
      driverTrips: [],
      consumerTrips: [],
      filterTags: [
        { name: '全部', value: 'all' },
        { name: '近7天', value: 'week' },
        { name: '近30天', value: 'month' }
      ]
    }
  },
  computed: {
    totalIncome() {
      return this.driverTrips.reduce((sum, item) => {
        const price = item.userGetMyTripList.price || 0
        const count = item.consumerList ? item.consumerList.length : 0
        return sum + price * count
      }, 0)
    },
    totalSpend() {
      return this.consumerTrips.reduce((sum, item) => {
        const price = item.consumer.price || 0
        const seats = item.consumer.seatCount || 1
        return sum + price * seats
      }, 0)
    }
  },
  watch: {
    driverTrips: {
      handler(arr) {
        arr.forEach(item => {
          const status = item.userGetMyTripList.status
          item.statusClass = this.getStatusClass(status)
          item.statusText = this.getStatusText(status)
        })
      },
      deep: true,
      immediate: true
    },
    consumerTrips: {
      handler(arr) {
        arr.forEach(item => {
          const status = item.consumer.status
          item.consumerStatusClass = this.getStatusClass(status)
          item.consumerStatusText = this.getStatusText(status)
        })
      },
      deep: true,
      immediate: true
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      if (this.loading) return
      this.loading = true
      try {
        const userId = uni.getStorageSync('userId')
        if (!userId) {
          uni.navigateTo({ url: '/pages/login/login' })
          return
        }
        const res = await request({
          url: '/user/trip/UserGetMyTripList',
          method: 'GET',
          data: { userId }
        })
        console.log('API响应:', res)
        if (res.code === 0 && res.data) {
          this.driverTrips = res.data.driverTrip || []
          this.consumerTrips = res.data.consumerTripDetails || []
          console.log('司机行程数:', this.driverTrips.length)
          console.log('乘客行程数:', this.consumerTrips.length)
          // 详细打印第一个司机行程的乘客数据
          if (this.driverTrips.length > 0) {
            console.log('第一个司机行程:', this.driverTrips[0])
            console.log('乘客列表:', this.driverTrips[0].consumerList)
            console.log('乘客数量:', this.driverTrips[0].consumerList?.length)
          }
        } else {
          uni.showToast({ title: res?.msg || '加载失败', icon: 'none' })
        }
      } catch (err) {
        console.error(err)
        uni.showToast({ title: '网络错误', icon: 'none' })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    onRefresh() {
      this.refreshing = true
      this.loadData()
    },
    selectTag(index, value) {
      this.activeTag = index
      // 可实现筛选
    },
    toggleDriverExpand(idx) {
      this.expandedDriverIndex = this.expandedDriverIndex === idx ? -1 : idx
    },
    toggleConsumerExpand(idx) {
      this.expandedConsumerIndex = this.expandedConsumerIndex === idx ? -1 : idx
    },
    formatDateTime(ts) {
      if (!ts) return '待定'
      const d = new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    getStatusText(status) {
      const map = { 0: '待出发', 1: '进行中', 2: '已完成', 3: '已取消' }
      return status !== null && status !== undefined ? (map[status] || '未知') : '待确认'
    },
    getStatusClass(status) {
      const map = { 0: 'status-pending', 1: 'status-active', 2: 'status-done', 3: 'status-cancel' }
      return status !== null && status !== undefined ? (map[status] || '') : 'status-pending'
    },
    calcDriverEarning(item) {
      const price = item.userGetMyTripList.price || 0
      const count = item.consumerList ? item.consumerList.length : 0
      if (count === 0) return (price * item.userGetMyTripList.seatCount).toFixed(2) + '（预期）'
      return (price * count).toFixed(2)
    },
    calcConsumerSpend(item) {
      const price = item.consumer.price || 0
      const seats = item.consumer.seatCount || 1
      return (price * seats).toFixed(2)
    },
    callPhone(phone) {
      if (phone) uni.makePhoneCall({ phoneNumber: phone })
      else uni.showToast({ title: '暂无电话', icon: 'none' })
    },
    contactUser(userId) {
      uni.navigateTo({ url: `/pages/message/chat?targetId=${userId}` })
    },
    viewDetail(id, role) {
      uni.navigateTo({ url: `/pages/trip/trip-detail?id=${id}&role=${role}` })
    },
    evaluateTrip(trip) {
      uni.navigateTo({ url: `/pages/trip/evaluate?id=${trip.id}` })
    },
    goToPublish() {
      uni.navigateTo({ url: '/pages/trip/publish' })
    },
    goToSearch() {
      uni.navigateTo({ url: '/pages/trip/search' })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}
.stats-bar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  padding: 36rpx 30rpx;
  margin-bottom: 0;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
}
.stat-value.income { color: #4ade80; }
.stat-value.spend  { color: #fb923c; }
.stat-value.trips  { color: #60a5fa; }
.stat-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.55);
}.p-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 6rpx;
}
.p-detail {
  display: block;
  font-size: 24rpx;
  color: #888;
}
.p-avatar {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #fff;
  font-weight: 700;
}
.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255,255,255,0.15);
}
.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 28rpx 0;
  position: relative;
}
.tab-icon { font-size: 32rpx; }
.tab-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 500;
}
.tab-item.active .tab-text {
  color: #1a1a2e;
  font-weight: 700;
}.p-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 6rpx;
}
.p-detail {
  display: block;
  font-size: 24rpx;
  color: #999;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  width: 60%;
  height: 4rpx;
  background: #1a1a2e;
  border-radius: 4rpx;
}
.tab-badge {
  background: #ef4444;
  color: #fff;
  font-size: 20rpx;
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}
.filter-tags {
  background: #fff;
  padding: 16rpx 24rpx;
  white-space: nowrap;
  border-bottom: 1rpx solid #eee;
}
.tag-item {
  display: inline-block;
  padding: 12rpx 28rpx;
  background: #f0f2f5;
  border-radius: 40rpx;
  font-size: 24rpx;
  color: #666;
  margin-right: 16rpx;
}
.tag-item.active {
  background: #1a1a2e;
  color: #fff;
}
.trip-scroll {
  flex: 1;
  padding: 24rpx 24rpx 40rpx;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
  gap: 20rpx;
}
.empty-icon { font-size: 100rpx; }
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.empty-desc {
  font-size: 26rpx;
  color: #999;
}
.empty-btn {
  margin-top: 20rpx;
  background: #1a1a2e;
  color: #fff;
  border-radius: 50rpx;
  padding: 20rpx 60rpx;
  font-size: 28rpx;
}
.trip-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06);
  border-left: 8rpx solid transparent;
}
.driver-card   { border-left-color: #4ade80; }
.consumer-card { border-left-color: #60a5fa; }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.role-badge {
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
  font-weight: 600;
}
.driver-badge   { background: #f0fdf4; color: #16a34a; }
.consumer-badge { background: #eff6ff; color: #1d4ed8; }
.trip-status {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
}
.status-pending { background: #fef9c3; color: #ca8a04; }
.status-active  { background: #dbeafe; color: #1d4ed8; }
.status-done    { background: #f0fdf4; color: #16a34a; }
.status-cancel  { background: #fef2f2; color: #dc2626; }
.route-section {
  margin-bottom: 24rpx;
}
.route-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.green-dot { background: #4ade80; }
.red-dot   { background: #f87171; }
.route-place {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
}
.route-connector {
  display: flex;
  align-items: center;
  padding-left: 8rpx;
  margin: 6rpx 0;
}
.connector-line {
  width: 2rpx;
  height: 30rpx;
  background: #ddd;
  margin-right: 14rpx;
}
.connector-arrow {
  font-size: 22rpx;
  color: #bbb;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.info-cell {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.info-label {
  font-size: 22rpx;
  color: #aaa;
}
.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}
.info-value.highlight { color: #1a1a2e; font-weight: 700; }
.income-color         { color: #16a34a !important; }
.spend-color          { color: #ea580c !important; }
.earning-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
  margin-bottom: 20rpx;
}
.earning-left {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.earning-label {
  font-size: 24rpx;
  color: #999;
}
.earning-amount {
  font-size: 40rpx;
  font-weight: 700;
}
.earning-note {
  font-size: 24rpx;
  color: #888;
  background: #f5f5f5;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}
.passenger-section {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
  margin-bottom: 20rpx;
}
.section-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
}
.toggle-label {
  font-size: 26rpx;
  color: #555;
  font-weight: 500;
}
.toggle-arrow {
  font-size: 24rpx;
  color: #aaa;
}
.passenger-list { margin-top: 16rpx; }
.passenger-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.passenger-row:last-child { border-bottom: none; }
.p-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #e8eaf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #5c6bc0;
  font-weight: 700;
}
.p-info { flex: 1; }
.p-id {
  display: block;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}
.p-seat {
  font-size: 22rpx;
  color: #999;
}
.p-action {
  background: #1a1a2e;
  color: #fff;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}
.no-passenger-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 16rpx;
}
.tip-icon {
  font-size: 32rpx;
}
.tip-text {
  font-size: 26rpx;
  color: #999;
}
.driver-info-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 0;
}
.driver-avatar-wrap {
  width: 80rpx;
  height: 80rpx;
  background: #fff8e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.driver-avatar-icon { font-size: 40rpx; }
.driver-detail { flex: 1; }
.driver-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 6rpx;
}
.driver-phone {
  font-size: 24rpx;
  color: #888;
}
.card-actions {
  display: flex;
  gap: 20rpx;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 24rpx;
}
.btn-secondary, .btn-primary {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 36rpx;
  font-size: 26rpx;
  text-align: center;
  border: none;
}
.btn-secondary {
  background: #f5f5f5;
  color: #666;
}
.btn-primary {
  background: #1a1a2e;
  color: #fff;
}
.loading-tip {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #bbb;
}
</style>
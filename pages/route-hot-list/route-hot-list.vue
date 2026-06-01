<template>
  <view class="route-list-container">
    <!-- 顶部搜索区域 -->
    <view class="search-section">
      <!-- 路线搜索卡片 -->
      <view class="route-search-card">
        <view class="card-title">
          <text class="title-icon">🚗</text>
          <text class="title-text">路线搜索</text>
        </view>
        <view class="route-input-group">
          <view class="input-wrapper">
            <text class="input-label">出发地</text>
            <input 
              class="route-input" 
              v-model="searchParams.localBegin" 
              placeholder="例如：南京工业大学"
              placeholder-class="placeholder"
              @confirm="searchRoutes"
            />
          </view>
          <view class="exchange-icon">↔️</view>
          <view class="input-wrapper">
            <text class="input-label">目的地</text>
            <input 
              class="route-input" 
              v-model="searchParams.localEnd" 
              placeholder="例如：新街口"
              placeholder-class="placeholder"
              @confirm="searchRoutes"
            />
          </view>
        </view>
        <button class="search-route-btn" @click="searchRoutes">
          <text>🔍 搜索路线</text>
        </button>
      </view>

      <!-- ID快速查找卡片 -->
      <view class="id-search-card">
        <view class="card-title">
          <text class="title-icon">🔢</text>
          <text class="title-text">快速查找</text>
        </view>
        <view class="id-input-group">
          <input 
            class="id-input" 
            v-model="searchTripId" 
            type="number"
            placeholder="输入行程ID"
            placeholder-class="placeholder"
            @confirm="searchByTripId"
          />
          <button class="search-id-btn" @click="searchByTripId">查找</button>
          <button v-if="searchTripId" class="clear-id-btn" @click="clearTripSearch">清除</button>
        </view>
      </view>
    </view>

    <!-- 统计与筛选栏 -->
    <view class="stats-filter-bar">
      <view class="stats-info">
        <text class="count">{{ displayTripList.length }}</text>
        <text class="unit">个行程</text>
      </view>
      <view class="filter-actions">
        <view class="filter-btn" @click="sortByTime" :class="{ active: sortType === 'time' }">
          <text>⏰ 时间</text>
          <text class="sort-icon" v-if="sortType === 'time'">{{ sortAsc ? '↑' : '↓' }}</text>
        </view>
        <view class="filter-btn" @click="sortBySeat" :class="{ active: sortType === 'seat' }">
          <text>💺 座位</text>
          <text class="sort-icon" v-if="sortType === 'seat'">{{ sortAsc ? '↑' : '↓' }}</text>
        </view>
        <view class="filter-btn" @click="showFilterModal = true">
          <text>🔧 筛选</text>
        </view>
      </view>
    </view>

    <!-- 行程列表 -->
    <scroll-view class="trip-list" scroll-y @scrolltolower="loadMore" :show-scrollbar="false">
      <!-- 搜索结果提示 -->
      <view v-if="isSearchingByTripId" class="search-tip">
        <text class="tip-icon">🔍</text>
        <text class="tip-text">正在搜索行程ID: {{ searchTripId }}</text>
        <text class="tip-clear" @click="clearTripSearch">清除</text>
      </view>
      
      <!-- 行程卡片 -->
      <view 
        v-for="trip in displayTripList" 
        :key="trip.tripId"
        class="trip-card"
        @click="viewTripDetail(trip.tripId)"
      >
        <view class="card-header">
          <image
            class="avatar"
            :src="trip.image || 'https://randomuser.me/api/portraits/lego/1.jpg'"
            mode="aspectFill"
          />
          <view class="user-info">
            <view class="name-row">
              <text class="username">{{ trip.userName }}</text>
              <view class="verify-badge">✓ 已认证</view>
            </view>
            <view class="trip-id">ID: {{ trip.tripId }}</view>
          </view>
          <view class="seat-badge">
            <text class="seat-num">{{ trip.seatCount }}</text>
            <text class="seat-unit">座位</text>
          </view>
        </view>
        
        <view class="card-body">
          <view class="route-info">
            <view class="route-point">
              <view class="point-dot start"></view>
              <text class="point-name">{{ trip.startPlace }}</text>
            </view>
            <view class="route-line"></view>
            <view class="route-point">
              <view class="point-dot end"></view>
              <text class="point-name">{{ trip.endPlace }}</text>
            </view>
          </view>
          
          <view class="trip-meta">
            <view class="meta-item">
              <text class="meta-icon">📅</text>
              <text class="meta-text">{{ formatDepartTime(trip.departTime) }}</text>
            </view>
            <view class="meta-item">
              <text class="meta-icon">💰</text>
              <text class="meta-text">协商</text>
            </view>
          </view>
        </view>
        
        <view class="card-footer">
          <view class="tags">
            <text class="tag">拼车</text>
            <text class="tag">顺路</text>
          </view>
          <button class="apply-btn" @tap.stop="openApply(trip)">
            申请同行 →
          </button>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="loading" class="state-tip">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      
      <view v-if="!loading && displayTripList.length === 0" class="state-tip">
        <text class="empty-icon">🚗</text>
        <text>{{ isSearchingByTripId ? '未找到该行程ID' : '暂无行程数据' }}</text>
        <text class="empty-hint">试试搜索其他路线吧</text>
      </view>
      
      <view v-if="noMore && displayTripList.length > 0 && !isSearchingByTripId" class="state-tip">
        <text>✨ 已经到底了 ✨</text>
      </view>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <view v-if="showFilterModal" class="modal-mask" @tap="showFilterModal = false">
      <view class="filter-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">筛选条件</text>
          <text class="modal-close" @tap="showFilterModal = false">✕</text>
        </view>
        
        <view class="modal-body">
          <view class="filter-section">
            <text class="section-title">📅 出发时间</text>
            <view class="date-range">
              <picker mode="date" :value="filterParams.startDate" @change="onStartDateChange">
                <view class="date-picker">
                  {{ filterParams.startDate || '开始日期' }}
                </view>
              </picker>
              <text>—</text>
              <picker mode="date" :value="filterParams.endDate" @change="onEndDateChange">
                <view class="date-picker">
                  {{ filterParams.endDate || '结束日期' }}
                </view>
              </picker>
            </view>
          </view>
          
          <view class="filter-section">
            <text class="section-title">💺 座位数量</text>
            <view class="seat-options">
              <view 
                v-for="num in seatRange" 
                :key="num"
                class="seat-option"
                :class="{ active: filterParams.minSeat == num }"
                @click="selectSeat(num)"
              >
                {{ num === '不限' ? '不限' : num + '+' }}
              </view>
            </view>
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="reset-btn" @click="resetFilter">重置</button>
          <button class="confirm-btn" @click="applyFilter">确定</button>
        </view>
      </view>
    </view>

    <!-- 申请同行弹窗 -->
    <view v-if="showApplyModal" class="modal-mask" @tap="closeApplyModal">
      <view class="apply-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">申请同行</text>
          <text class="modal-close" @tap="closeApplyModal">✕</text>
        </view>
        
        <view class="modal-body">
          <view class="trip-preview">
            <text class="driver-name">{{ currentTrip.userName }}</text>
            <text class="route-preview">{{ currentTrip.startPlace }} → {{ currentTrip.endPlace }}</text>
          </view>
          
          <view class="message-section">
            <text class="section-title">📝 给司机留言</text>
            <textarea
              class="message-input"
              v-model="applyMessage"
              placeholder="可说明出发地点、行李情况等..."
              placeholder-class="message-placeholder"
              :maxlength="200"
              auto-height
            />
            <text class="char-count">{{ applyMessage.length }}/200</text>
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="cancel-btn" @tap="closeApplyModal">取消</button>
          <button class="submit-btn" :disabled="submitting" @tap="submitApply">
            {{ submitting ? '提交中...' : '确认申请' }}
          </button>
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
      tripList: [],
      displayTripList: [],
      loading: false,
      pageNum: 1,
      pageSize: 20,
      noMore: false,
      
      searchParams: {
        localBegin: '',
        localEnd: ''
      },
      
      searchTripId: '',
      isSearchingByTripId: false,
      tripIdSearchResult: null, // 存储 tripId 搜索结果
      
      sortType: 'time',
      sortAsc: true,
      
      filterParams: {
        startDate: '',
        endDate: '',
        minSeat: ''
      },
      
      showFilterModal: false,
      seatRange: ['不限', 1, 2, 3, 4, 5],
      
      showApplyModal: false,
      submitting: false,
      applyMessage: '',
      currentTrip: {}
    }
  },

  onLoad(options) {
    if (options.localBegin && options.localEnd) {
      this.searchParams.localBegin = decodeURIComponent(options.localBegin)
      this.searchParams.localEnd = decodeURIComponent(options.localEnd)
    }
    
    if (options.tripId) {
      this.searchTripId = options.tripId
      this.searchByTripId()
    } else {
      this.loadRoutes()
    }
  },

  methods: {
    // 按路线查询行程列表
    async loadRoutes(isLoadMore = false) {
      if (this.loading) return
      if (isLoadMore && this.noMore) return
      
      if (!isLoadMore) {
        this.pageNum = 1
        this.noMore = false
        this.tripList = []
      }
      
      this.loading = true
      
      try {
        const res = await request({
          url: '/carpool/routes/hotRouteDetails',
          method: 'POST',
          data: {
            localBegin: this.searchParams.localBegin,
            localEnd: this.searchParams.localEnd
          }
        })
        
        if (res.code === 0 && res.data && Array.isArray(res.data)) {
          if (isLoadMore) {
            this.tripList = [...this.tripList, ...res.data]
          } else {
            this.tripList = res.data
          }
          
          this.updateDisplayList()
          
          if (res.data.length < this.pageSize) {
            this.noMore = true
          }
        } else {
          if (!isLoadMore) this.tripList = []
          this.updateDisplayList()
        }
      } catch (err) {
        console.error('获取行程列表失败:', err)
        uni.showToast({ title: '获取行程失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    // 按 tripId 查询单个行程
    async searchByTripId() {
      if (!this.searchTripId) {
        uni.showToast({ title: '请输入行程ID', icon: 'none' })
        return
      }
      
      // 检查输入是否为有效数字
      const tripIdNum = Number(this.searchTripId)
      if (isNaN(tripIdNum)) {
        uni.showToast({ title: '请输入有效的行程ID', icon: 'none' })
        return
      }
      
      this.loading = true
      this.isSearchingByTripId = true
      
      try {
        // 调用后端 GET 接口，参数在路径中
        const res = await request({
          url: `/carpool/routes/getByTripId/${tripIdNum}`,
          method: 'GET'
        })
        
        console.log('tripId查询结果:', res)
        
        if (res.code === 0 && res.data) {
          // 将单个行程数据包装成数组
          this.tripIdSearchResult = res.data
          this.updateDisplayList()
          uni.showToast({ title: '找到行程', icon: 'success' })
        } else {
          this.tripIdSearchResult = null
          this.updateDisplayList()
          uni.showToast({ title: res.msg || '未找到该行程ID', icon: 'none' })
        }
      } catch (err) {
        console.error('查询行程失败:', err)
        this.tripIdSearchResult = null
        this.updateDisplayList()
        uni.showToast({ title: '查询失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    // 更新显示列表
    updateDisplayList() {
      // 如果正在进行 tripId 搜索，显示搜索结果
      if (this.isSearchingByTripId) {
        if (this.tripIdSearchResult) {
          this.displayTripList = [this.tripIdSearchResult]
        } else {
          this.displayTripList = []
        }
        return
      }
      
      // 否则显示路线搜索结果并应用筛选排序
      let list = [...this.tripList]
      
      // 日期范围筛选
      if (this.filterParams.startDate) {
        const startDate = new Date(this.filterParams.startDate)
        list = list.filter(trip => new Date(trip.departTime) >= startDate)
      }
      
      if (this.filterParams.endDate) {
        const endDate = new Date(this.filterParams.endDate)
        endDate.setDate(endDate.getDate() + 1)
        list = list.filter(trip => new Date(trip.departTime) <= endDate)
      }
      
      // 座位数筛选
      if (this.filterParams.minSeat && this.filterParams.minSeat !== '不限') {
        const minSeat = Number(this.filterParams.minSeat)
        list = list.filter(trip => trip.seatCount >= minSeat)
      }
      
      // 排序
      if (this.sortType === 'time') {
        list.sort((a, b) => this.sortAsc ? a.departTime - b.departTime : b.departTime - a.departTime)
      } else if (this.sortType === 'seat') {
        list.sort((a, b) => this.sortAsc ? a.seatCount - b.seatCount : b.seatCount - a.seatCount)
      }
      
      this.displayTripList = list
    },
    
    // 清除 tripId 搜索
    clearTripSearch() {
      this.searchTripId = ''
      this.isSearchingByTripId = false
      this.tripIdSearchResult = null
      this.updateDisplayList()
    },
    
    // 搜索路线
    searchRoutes() {
      if (!this.searchParams.localBegin || !this.searchParams.localEnd) {
        uni.showToast({ title: '请填写出发地和目的地', icon: 'none' })
        return
      }
      this.clearTripSearch()
      this.loadRoutes()
    },
    
    // 加载更多
    loadMore() {
      if (!this.loading && !this.noMore && !this.isSearchingByTripId) {
        this.pageNum++
        this.loadRoutes(true)
      }
    },
    
    // 按时间排序
    sortByTime() {
      if (this.sortType === 'time') {
        this.sortAsc = !this.sortAsc
      } else {
        this.sortType = 'time'
        this.sortAsc = true
      }
      this.updateDisplayList()
    },
    
    // 按座位排序
    sortBySeat() {
      if (this.sortType === 'seat') {
        this.sortAsc = !this.sortAsc
      } else {
        this.sortType = 'seat'
        this.sortAsc = true
      }
      this.updateDisplayList()
    },
    
    formatDepartTime(timestamp) {
      if (!timestamp || timestamp === 0) return '时间待定'
      const date = new Date(timestamp)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      
      if (targetDate.getTime() === today.getTime()) {
        return `今天 ${timeStr}`
      } else if (targetDate.getTime() === today.getTime() + 86400000) {
        return `明天 ${timeStr}`
      } else {
        return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
      }
    },
    
    onStartDateChange(e) {
      this.filterParams.startDate = e.detail.value
    },
    
    onEndDateChange(e) {
      this.filterParams.endDate = e.detail.value
    },
    
    selectSeat(num) {
      this.filterParams.minSeat = num === '不限' ? '' : String(num)
    },
    
    resetFilter() {
      this.filterParams = {
        startDate: '',
        endDate: '',
        minSeat: ''
      }
      this.applyFilter()
    },
    
    applyFilter() {
      this.showFilterModal = false
      this.updateDisplayList()
    },
    
    viewTripDetail(tripId) {
      uni.navigateTo({
        url: `/pages/trip-detail/trip-detail?tripId=${tripId}`
      })
    },
    
    openApply(trip) {
      this.currentTrip = trip
      this.applyMessage = ''
      this.showApplyModal = true
    },
    
    closeApplyModal() {
      this.showApplyModal = false
    },
    
    submitApply() {
      if (this.submitting) return
      
      const token = uni.getStorageSync('accessToken')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        this.closeApplyModal()
        uni.reLaunch({ url: '/pages/login/login' })
        return
      }
      
      const userId = uni.getStorageSync('userId')
      if (!userId) {
        uni.showToast({ title: '用户信息异常', icon: 'none' })
        return
      }
      
      this.submitting = true
      
      request({
        url: '/admin-api/trip/apply/create',
        method: 'POST',
        data: {
          tripId: this.currentTrip.tripId,
          userId: Number(userId),
          status: 0,
          message: this.applyMessage.trim()
        }
      }).then(() => {
        this.closeApplyModal()
        uni.showToast({ title: '申请已发送，等待确认', icon: 'success' })
      }).catch((err) => {
        console.error('申请失败:', err)
        uni.showToast({ title: err.msg || '申请失败，请重试', icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
    }
  }
}
</script>

<style scoped>
/* 样式保持不变，和之前优化过的版本一样 */
.route-list-container {
  min-height: 100vh;
  background: #f5f7fb;
}

.search-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30rpx 30rpx 50rpx;
  border-radius: 0 0 40rpx 40rpx;
}

.route-search-card, .id-search-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 25rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.title-icon {
  font-size: 32rpx;
  margin-right: 10rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.route-input-group {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.input-wrapper {
  flex: 1;
}

.input-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.route-input {
  background: #f5f7fb;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
}

.exchange-icon {
  font-size: 32rpx;
  color: #667eea;
}

.search-route-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50rpx;
  margin-top: 20rpx;
  font-size: 28rpx;
  border: none;
}

.id-input-group {
  display: flex;
  gap: 15rpx;
}

.id-input {
  flex: 1;
  background: #f5f7fb;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
}

.search-id-btn {
  background: #4CAF50;
  color: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
}

.clear-id-btn {
  background: #f44336;
  color: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
}

.stats-filter-bar {
  background: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
}

.stats-info {
  display: flex;
  align-items: baseline;
  gap: 5rpx;
}

.count {
  font-size: 40rpx;
  font-weight: bold;
  color: #667eea;
}

.unit {
  font-size: 26rpx;
  color: #999;
}

.filter-actions {
  display: flex;
  gap: 30rpx;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 5rpx;
  padding: 10rpx 20rpx;
  border-radius: 30rpx;
  background: #f5f7fb;
  font-size: 26rpx;
  color: #666;
  transition: all 0.3s;
}

.filter-btn.active {
  background: #667eea;
  color: #fff;
}

.sort-icon {
  font-size: 24rpx;
}

.trip-list {
  height: calc(100vh - 520rpx);
  padding: 20rpx 30rpx;
}

.trip-card {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  padding: 25rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.trip-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 5rpx;
}

.username {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.verify-badge {
  font-size: 20rpx;
  color: #4CAF50;
  background: #E8F5E9;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.trip-id {
  font-size: 22rpx;
  color: #999;
}

.seat-badge {
  text-align: center;
  background: #FFF3E0;
  padding: 10rpx 20rpx;
  border-radius: 40rpx;
}

.seat-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #FF9800;
}

.seat-unit {
  font-size: 20rpx;
  color: #FF9800;
  margin-left: 5rpx;
}

.card-body {
  margin-bottom: 20rpx;
}

.route-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.route-point {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.point-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.point-dot.start {
  background: #4CAF50;
  box-shadow: 0 0 0 4rpx rgba(76, 175, 80, 0.2);
}

.point-dot.end {
  background: #f44336;
  box-shadow: 0 0 0 4rpx rgba(244, 67, 54, 0.2);
}

.point-name {
  font-size: 26rpx;
  color: #666;
  text-align: center;
}

.route-line {
  flex: 2;
  height: 2rpx;
  background: linear-gradient(90deg, #4CAF50, #f44336);
  position: relative;
}

.route-line::before {
  content: '✈️';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 24rpx;
}

.trip-meta {
  display: flex;
  justify-content: space-around;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  font-size: 24rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #999;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.tags {
  display: flex;
  gap: 15rpx;
}

.tag {
  font-size: 22rpx;
  color: #667eea;
  background: #F3E5F5;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.apply-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
  padding: 12rpx 30rpx;
  margin: 0;
  border: none;
}

.state-tip {
  text-align: center;
  padding: 60rpx;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #f3f3f3;
  border-top: 4rpx solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 80rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #ccc;
}

.search-tip {
  background: #E3F2FD;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.tip-icon {
  font-size: 28rpx;
}

.tip-text {
  flex: 1;
  font-size: 26rpx;
  color: #1976D2;
}

.tip-clear {
  color: #f44336;
  padding: 8rpx 20rpx;
  background: #fff;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.filter-modal, .apply-modal {
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 40rpx;
  color: #999;
}

.modal-body {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 40rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.date-picker {
  flex: 1;
  padding: 20rpx;
  background: #f5f7fb;
  border-radius: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #666;
}

.seat-options {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.seat-option {
  padding: 15rpx 30rpx;
  background: #f5f7fb;
  border-radius: 40rpx;
  font-size: 26rpx;
  color: #666;
}

.seat-option.active {
  background: #667eea;
  color: #fff;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.reset-btn, .cancel-btn {
  flex: 1;
  background: #f5f7fb;
  color: #666;
  border-radius: 50rpx;
  border: none;
}

.confirm-btn, .submit-btn {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50rpx;
  border: none;
}

.trip-preview {
  background: #F3E5F5;
  padding: 30rpx;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  text-align: center;
}

.driver-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 10rpx;
}

.route-preview {
  font-size: 26rpx;
  color: #666;
}

.message-section {
  position: relative;
}

.message-input {
  width: 100%;
  min-height: 200rpx;
  background: #f5f7fb;
  border-radius: 20rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.5;
}

.char-count {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  font-size: 22rpx;
  color: #999;
}

.placeholder {
  color: #ccc;
}

.message-placeholder {
  color: #ccc;
}
</style>
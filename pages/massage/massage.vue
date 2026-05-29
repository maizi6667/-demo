<template>
  <view class="message-container">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="header-title">行程申请详情</text>
      <view class="placeholder"></view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-animation">
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
      </view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content-scroll" scroll-y v-else>
      <!-- 申请信息卡片 -->
      <view class="info-card">
        <view class="card-title">
          <text class="title-icon">📋</text>
          <text class="title-text">申请信息</text>
        </view>
        
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">行程ID</text>
            <text class="info-value">{{ applyData.tripId || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">申请人姓名</text>
            <text class="info-value">{{ applyData.consumerName || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ applyData.consumerMobile || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">申请状态</text>
            <view class="status-badge" :class="statusClass">
              <text>{{ statusText }}</text>
            </view>
          </view>
          <view class="info-item" v-if="applyData.message">
            <text class="info-label">留言内容</text>
            <text class="info-value message-content">{{ applyData.message }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区域（根据状态显示） -->
      <view class="action-section" v-if="applyData.status === 0">
        <view class="action-title">操作</view>
        <view class="action-buttons">
          <button class="action-btn agree" @click="handleAgree">
            <text>✓ 同意申请</text>
          </button>
          <button class="action-btn reject" @click="handleReject">
            <text>✗ 拒绝申请</text>
          </button>
          <button class="action-btn contact" @click="contactApplicant" v-if="applyData.consumerMobile">
            <text>📞 联系申请人</text>
          </button>
        </view>
      </view>

      <!-- 状态提示 -->
      <view class="status-tip" v-if="applyData.status === 1">
        <text class="tip-icon">✅</text>
        <text class="tip-text">申请已同意，请及时联系对方确认行程</text>
      </view>
      <view class="status-tip error" v-if="applyData.status === 2">
        <text class="tip-icon">❌</text>
        <text class="tip-text">申请已被拒绝</text>
      </view>
      <view class="status-tip warning" v-if="applyData.status === 3">
        <text class="tip-icon">⚠️</text>
        <text class="tip-text">申请已取消</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      loading: false,
      applyData: {
        tripId: null,
        consumerName: '',
        consumerMobile: '',
        status: null,
        message: ''
      },
      statusClass: '',
      statusText: ''
    }
  },
  onLoad(options) {
    // 如果路由参数中有 tripId，可以传入；否则直接加载（后端根据当前司机返回申请）
    this.loadApplyData()
  },
  watch: {
    'applyData.status': {
      handler(newStatus) {
        this.updateStatusDisplay(newStatus)
      },
      immediate: true
    }
  },
  methods: {
    async loadApplyData() {
      this.loading = true
      try {
        // 注意：后端返回的是 List<ApplyDetails>，这里取第一个（或根据需求筛选）
        const res = await request({
          url: '/user/trip/apply/get',
          method: 'GET'
        })
        
        console.log('申请数据响应:', res)
        
        if (res.code === 0 && res.data && res.data.length > 0) {
          // 若返回数组，取第一个；若直接返回对象，可兼容
          this.applyData = Array.isArray(res.data) ? res.data[0] : res.data
        } else {
          uni.showToast({
            title: res.msg || '暂无申请数据',
            icon: 'none'
          })
        }
      } catch (err) {
        console.error('加载申请数据失败:', err)
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    updateStatusDisplay(status) {
      const statusMap = {
        0: { text: '待确认', class: 'status-pending' },
        1: { text: '已同意', class: 'status-agreed' },
        2: { text: '已拒绝', class: 'status-rejected' },
        3: { text: '已取消', class: 'status-canceled' }
      }
      const info = statusMap[status] || { text: '未知状态', class: '' }
      this.statusText = info.text
      this.statusClass = info.class
    },
    
    handleAgree() {
      uni.showModal({
        title: '确认同意',
        content: '确定要同意这个行程申请吗？',
        success: (res) => {
          if (res.confirm) {
            this.updateApplyStatus(1, '同意申请')
          }
        }
      })
    },
    
    handleReject() {
      uni.showModal({
        title: '拒绝申请',
        content: '确定要拒绝这个行程申请吗？',
        success: (res) => {
          if (res.confirm) {
            this.updateApplyStatus(2, '已拒绝')
          }
        }
      })
    },
    
    async updateApplyStatus(status, successMsg) {
      // 注意：新数据结构中没有申请ID，使用 tripId 作为更新标识（请根据后端接口调整）
      if (!this.applyData.tripId) {
        uni.showToast({
          title: '缺少行程标识，无法操作',
          icon: 'none'
        })
        return
      }
      try {
        const res = await request({
          url: '/user/trip/apply/modifyStatusApply',
          method: 'PUT',
          data: {
            tripId: this.applyData.tripId,  // 改为使用 tripId
            status: status
          }
        })
        
        if (res.code === 0) {
          this.applyData.status = status
          uni.showToast({
            title: successMsg,
            icon: 'success'
          })
          setTimeout(() => {
            this.goBack()
          }, 1500)
        } else {
          uni.showToast({
            title: res.msg || '操作失败',
            icon: 'none'
          })
        }
      } catch (err) {
        console.error('更新状态失败:', err)
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    },
    
    contactApplicant() {
      const mobile = this.applyData.consumerMobile
      if (mobile) {
        uni.makePhoneCall({
          phoneNumber: mobile
        })
      } else {
        uni.showToast({
          title: '无法获取联系电话',
          icon: 'none'
        })
      }
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
/* 全局平滑过渡 */
.message-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fb 0%, #f0f2f8 100%);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 头部样式 - 毛玻璃效果加强 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 30rpx 20rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  border-bottom: none;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.back-btn:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.94);
}

.back-icon {
  font-size: 52rpx;
  color: #1e2a3a;
  font-weight: 500;
  line-height: 1;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #1e2a3a 0%, #2c3e50 100%);
  background-clip: text;
  color: transparent;
  letter-spacing: 1rpx;
}

.placeholder {
  width: 68rpx;
}

/* 加载状态 - 优雅动画 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
}

.loading-animation {
  display: flex;
  gap: 20rpx;
  align-items: center;
  justify-content: center;
}

.loading-dot {
  width: 20rpx;
  height: 20rpx;
  background: linear-gradient(135deg, #4a6cf7 0%, #6c8eff 100%);
  border-radius: 50%;
  animation: bounce 1.2s ease-in-out infinite;
}

.loading-dot:nth-child(1) { animation-delay: -0.3s; }
.loading-dot:nth-child(2) { animation-delay: -0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
}

.loading-text {
  font-size: 28rpx;
  color: #7c8a9e;
  font-weight: 500;
  letter-spacing: 1rpx;
}

/* 内容区域 */
.content-scroll {
  flex: 1;
  padding: 28rpx 28rpx 40rpx;
}

/* 信息卡片 - 轻盈弥散阴影 */
.info-card {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(2px);
  border-radius: 40rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.06), 0 2rpx 6rpx rgba(0, 0, 0, 0.02);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
}

.info-card:active {
  transform: translateY(-2rpx);
  box-shadow: 0 24rpx 48rpx rgba(0, 0, 0, 0.08);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid rgba(74, 108, 247, 0.12);
}

.title-icon {
  font-size: 40rpx;
  filter: drop-shadow(0 4rpx 6rpx rgba(0,0,0,0.05));
}

.title-text {
  font-size: 34rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #1f2b38 0%, #2d3e50 100%);
  background-clip: text;
  color: transparent;
  letter-spacing: -0.5rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  line-height: 1.4;
}

.info-label {
  width: 150rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #6a7c90;
  flex-shrink: 0;
  letter-spacing: 0.5rpx;
}

.info-value {
  flex: 1;
  font-size: 30rpx;
  font-weight: 540;
  color: #1e2f3e;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.01);
  padding: 6rpx 0;
  border-radius: 12rpx;
}

.message-content {
  background: #f4f7fe;
  padding: 20rpx;
  border-radius: 24rpx;
  color: #2c4f6e;
  font-weight: 500;
  line-height: 1.5;
  border: 1rpx solid rgba(74, 108, 247, 0.1);
  font-size: 28rpx;
}

/* 状态标签 - 精致光效 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 28rpx;
  border-radius: 80rpx;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}

.status-pending {
  background: linear-gradient(135deg, #fff7e8 0%, #ffe8c8 100%);
  color: #e67e22;
  border: 1rpx solid rgba(230, 126, 34, 0.2);
}

.status-agreed {
  background: linear-gradient(135deg, #e8f9ed 0%, #d0f0db 100%);
  color: #2e7d32;
  border: 1rpx solid rgba(46, 125, 50, 0.2);
}

.status-rejected {
  background: linear-gradient(135deg, #feeceb 0%, #ffd9d6 100%);
  color: #c62828;
  border: 1rpx solid rgba(198, 40, 40, 0.2);
}

.status-canceled {
  background: linear-gradient(135deg, #eff2f5 0%, #e2e6ec 100%);
  color: #5d6e85;
  border: 1rpx solid rgba(93, 110, 133, 0.2);
}

/* 操作区域 */
.action-section {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(2px);
  border-radius: 40rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.7);
}

.action-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2b38;
  margin-bottom: 28rpx;
  padding-left: 8rpx;
  letter-spacing: -0.3rpx;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.action-btn {
  flex: 1;
  min-width: 210rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 60rpx;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
  border: none;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.06);
  letter-spacing: 2rpx;
}

.action-btn:active {
  transform: scale(0.96);
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

.action-btn.agree {
  background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
  color: #fff;
}

.action-btn.reject {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  color: #fff;
}

.action-btn.contact {
  background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%);
  color: #fff;
}

/* 状态提示块 - 柔和轻质感 */
.status-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 32rpx;
  border-radius: 40rpx;
  margin-bottom: 24rpx;
  backdrop-filter: blur(4px);
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.02);
}

.status-tip {
  background: rgba(232, 245, 233, 0.9);
  border: 1rpx solid rgba(46, 125, 50, 0.2);
}

.status-tip.error {
  background: rgba(255, 235, 238, 0.9);
  border: 1rpx solid rgba(198, 40, 40, 0.2);
}

.status-tip.warning {
  background: rgba(255, 243, 224, 0.9);
  border: 1rpx solid rgba(230, 126, 34, 0.2);
}

.tip-icon {
  font-size: 44rpx;
  filter: drop-shadow(0 2rpx 4rpx rgba(0,0,0,0.1));
}

.tip-text {
  font-size: 28rpx;
  font-weight: 540;
  color: #2c3e50;
}

.status-tip.error .tip-text {
  color: #b71c1c;
}

.status-tip.warning .tip-text {
  color: #e65100;
}

::-webkit-scrollbar {
  width: 6rpx;
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 20rpx;
}
</style>
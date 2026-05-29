<template>
  <view class="profile-container">
    <!-- 顶部背景 -->
    <view class="header-bg"></view>
    
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info" @click="editProfile">
        <image 
          class="avatar" 
          :src="userInfo.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'" 
          mode="aspectFill"
        />
        <view class="user-detail">
          <view class="username-row">
            <text class="username">{{ userInfo.username || '未登录' }}</text>
            <text class="level" v-if="userInfo.level">Lv.{{ userInfo.level }}</text>
          </view>
          <text class="phone">{{ userInfo.phone || '绑定手机号' }}</text>
          <view class="certification" v-if="userInfo.realName">
            <text class="cert-icon">✓</text>
            <text>已实名认证</text>
          </view>
        </view>
        <view class="edit-icon">›</view>
      </view>
      
      <!-- 统计数据 -->
      <view class="stats-row">
        <view class="stat-item" @click="goToMyTrip">
          <text class="stat-num">{{ stats.totalTrips }}</text>
          <text class="stat-label">总行程</text>
        </view>
        <view class="stat-item" @click="goToPage('/pages/trip/my-publish')">
          <text class="stat-num">{{ stats.publishCount }}</text>
          <text class="stat-label">发布行程</text>
        </view>
        <view class="stat-item" @click="goToPage('/pages/trip/my-apply')">
          <text class="stat-num">{{ stats.applyCount }}</text>
          <text class="stat-label">申请中</text>
        </view>
        <view class="stat-item" @click="goToPage('/pages/trip/completed')">
          <text class="stat-num">{{ stats.completedCount }}</text>
          <text class="stat-label">已完成</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <!-- 我的行程 -->
      <view class="menu-group">
        <view class="menu-item" @click="goToMyTrip">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E8F5E9;">
              <text>🚗</text>
            </view>
            <text class="menu-title">我的行程</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/trip/my-publish')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #FFF3E0;">
              <text>📝</text>
            </view>
            <text class="menu-title">我发布的</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/trip/my-apply')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E3F2FD;">
              <text>✉️</text>
            </view>
            <text class="menu-title">我的申请</text>
            <text class="badge" v-if="stats.pendingCount">{{ stats.pendingCount }}</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 资金与钱包 -->
      <view class="menu-group">
        <view class="menu-item" @click="goToPage('/pages/wallet/wallet')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E8EAF6;">
              <text>💰</text>
            </view>
            <text class="menu-title">我的钱包</text>
          </view>
          <view class="menu-right">
            <text class="balance">¥{{ userInfo.balance || '0.00' }}</text>
            <text class="menu-arrow">›</text>
          </view>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/wallet/recharge')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #FCE4EC;">
              <text>💳</text>
            </view>
            <text class="menu-title">充值</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/wallet/withdraw')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #FFF3E0;">
              <text>💸</text>
            </view>
            <text class="menu-title">提现</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 安全与设置 -->
      <view class="menu-group">
        <view class="menu-item" @click="goToPage('/pages/profile/certification')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E8F5E9;">
              <text>🛡️</text>
            </view>
            <text class="menu-title">实名认证</text>
            <text class="status" v-if="userInfo.realName">已认证</text>
            <text class="status warning" v-else>未认证</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/profile/safety')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #FCE4EC;">
              <text>🔐</text>
            </view>
            <text class="menu-title">安全中心</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/profile/settings')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #F3E5F5;">
              <text>⚙️</text>
            </view>
            <text class="menu-title">设置</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 其他 -->
      <view class="menu-group">
        <view class="menu-item" @click="goToPage('/pages/profile/about')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E0F2F1;">
              <text>ℹ️</text>
            </view>
            <text class="menu-title">关于我们</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/profile/feedback')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #FFF3E0;">
              <text>💬</text>
            </view>
            <text class="menu-title">意见反馈</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        
        <view class="menu-item" @click="goToPage('/pages/profile/help')">
          <view class="menu-left">
            <view class="menu-icon" style="background: #E3F2FD;">
              <text>❓</text>
            </view>
            <text class="menu-title">帮助中心</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-section">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      userInfo: {
        id: null,
        username: '',
        phone: '',
        avatar: '',
        realName: '',
        idCard: '',
        level: 1,
        balance: 0,
        points: 0,
        createTime: null
      },
      stats: {
        totalTrips: 0,      // 总行程
        publishCount: 0,     // 发布数量
        applyCount: 0,       // 申请数量
        pendingCount: 0,     // 待处理数量
        completedCount: 0,   // 已完成数量
        cancelledCount: 0    // 已取消数量
      }
    }
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserInfo()
    this.loadStats()
  },

  methods: {
    // 加载用户信息
    async loadUserInfo() {
      try {
        const userId = uni.getStorageSync('userId')
        if (!userId) return
        
        const res = await request({
          url: `/system/user/profile/${userId}`,
          method: 'GET'
        })
        
        if (res.code === 0 && res.data) {
          this.userInfo = {
            ...this.userInfo,
            ...res.data
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err)
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        const userId = uni.getStorageSync('userId')
        if (!userId) return
        console.log('userID{}',userId )
        const res = await request({
          url: '/trip/user/get',
          method: 'GET',
          data: { userId }
        })
        
        if (res.code === 0 && res.data) {
          this.stats = {
            ...this.stats,
            ...res.data
          }
        }
      } catch (err) {
        console.error('获取统计数据失败:', err)
        // 使用模拟数据
        this.stats = {
          totalTrips: 12,
          publishCount: 5,
          applyCount: 3,
          pendingCount: 2,
          completedCount: 8,
          cancelledCount: 1
        }
      }
    },
    
    // 跳转到我的行程页面
    goToMyTrip() {
      uni.navigateTo({
        url: '/pages/profile/MyTrip/MyTrip'
      })
    },
    
    // 跳转页面
    goToPage(url) {
      uni.navigateTo({
        url: url
      })
    },
    
    // 编辑个人资料
    editProfile() {
      uni.navigateTo({
        url: '/pages/profile/edit'
      })
    },
    
    // 退出登录
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除本地存储
            uni.removeStorageSync('accessToken')
            uni.removeStorageSync('userId')
            uni.removeStorageSync('userInfo')
            
            // 跳转到登录页
            uni.reLaunch({
              url: '/pages/login/login'
            })
            
            uni.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: #f5f7fb;
  padding-bottom: 120rpx;
}

/* 顶部背景 */
.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 0 40rpx 40rpx;
}

/* 用户卡片 */
.user-card {
  background: #fff;
  margin: 40rpx 30rpx 20rpx;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 25rpx;
  border: 3rpx solid #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.user-detail {
  flex: 1;
}

.username-row {
  display: flex;
  align-items: center;
  gap: 15rpx;
  margin-bottom: 8rpx;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.level {
  font-size: 24rpx;
  color: #FF9800;
  background: #FFF3E0;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.phone {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.certification {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #4CAF50;
  background: #E8F5E9;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  width: fit-content;
}

.cert-icon {
  font-size: 20rpx;
}

.edit-icon {
  font-size: 48rpx;
  color: #ccc;
}

/* 统计数据 */
.stats-row {
  display: flex;
  justify-content: space-around;
  padding-top: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

/* 菜单分组 */
.menu-section {
  margin: 20rpx 30rpx;
}

.menu-group {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.menu-title {
  font-size: 30rpx;
  color: #333;
}

.badge {
  background: #f44336;
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 15rpx;
}

.status {
  font-size: 24rpx;
  color: #4CAF50;
  margin-left: 15rpx;
}

.status.warning {
  color: #FF9800;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.balance {
  font-size: 28rpx;
  font-weight: bold;
  color: #FF9800;
}

.menu-arrow {
  font-size: 40rpx;
  color: #ccc;
}

/* 退出登录 */
.logout-section {
  padding: 40rpx 30rpx;
}

.logout-btn {
  background: #fff;
  color: #f44336;
  border: 1rpx solid #f44336;
  border-radius: 50rpx;
  font-size: 30rpx;
  padding: 25rpx;
}
</style> 
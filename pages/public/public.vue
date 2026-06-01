<template>
  <view class="container">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn" @tap="goBack">
        ←
      </view>
      <view class="header-title">
        发布行程
      </view>
      <view class="publish-btn" @tap="submitPublish">
        发布
      </view>
    </view>

    <!-- 表单内容 -->
    <scroll-view scroll-y class="form-container">
      <!-- 路线信息 -->
      <view class="form-section">
        <view class="section-title">
          <text class="required">*</text> 路线信息
        </view>
        
        <!-- 出发地 -->
        <view class="form-item">
          <view class="item-label">
            <text class="required">*</text> 出发地
          </view>
          <input 
            class="item-input" 
            v-model="formData.startPlace"
            placeholder="请输入出发地，如：南京工业大学"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 目的地 -->
        <view class="form-item">
          <view class="item-label">
            <text class="required">*</text> 目的地
          </view>
          <input 
            class="item-input" 
            v-model="formData.endPlace"
            placeholder="请输入目的地，如：南京南站"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="form-section">
        <view class="section-title">
          <text class="required">*</text> 时间信息
        </view>

        <!-- 出发日期+时间 -->
        <view class="form-item" @tap="showDateTimePicker">
          <view class="item-label">
            <text class="required">*</text> 出发时间
          </view>
          <view class="item-value">
            {{ formData.departTimeDisplay || '请选择出发时间' }}
          </view>
          <view class="item-arrow">›</view>
        </view>
      </view>

      <!-- 车辆信息 -->
      <view class="form-section">
        <view class="section-title">
          <text class="required">*</text> 车辆信息
        </view>

        <!-- 剩余座位 -->
        <view class="form-item">
          <view class="item-label">
            <text class="required">*</text> 剩余座位
          </view>
          <picker 
            :range="seatOptions" 
            @change="onSeatChange"
          >
            <view class="item-value">
              {{ formData.seatCountDisplay || '请选择座位数' }}
            </view>
            <view class="item-arrow">›</view>
          </picker>
        </view>

        <!-- 拼车费用 -->
        <view class="form-item">
          <view class="item-label">
            <text class="required">*</text> 拼车费用
          </view>
          <input 
            class="item-input" 
            v-model="formData.price"
            type="digit"
            placeholder="请输入费用（元）"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 车辆信息 -->
        <view class="form-item">
          <view class="item-label">
            车辆信息
          </view>
          <input 
            class="item-input" 
            v-model="formData.carInfo"
            placeholder="如：白色SUV，空间宽敞"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 车辆型号 -->
        <view class="form-item">
          <view class="item-label">
            车辆型号
          </view>
          <input 
            class="item-input" 
            v-model="formData.carModel"
            placeholder="如：SUV、轿车"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 车牌号 -->
        <view class="form-item">
          <view class="item-label">
            车牌号
          </view>
          <input 
            class="item-input" 
            v-model="formData.carNumber"
            placeholder="如：苏A·12345"
            placeholder-class="placeholder"
          />
        </view>

        <!-- 联系方式 -->
        <view class="form-item">
          <view class="item-label">
            <text class="required">*</text> 联系方式
          </view>
          <input 
            class="item-input" 
            v-model="formData.contact"
            type="number"
            maxlength="11"
            placeholder="请填写手机号"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <!-- 其他信息 -->
      <view class="form-section">
        <view class="section-title">
          其他信息
        </view>

        <!-- 备注 -->
        <view class="form-item textarea-item">
          <view class="item-label">
            备注
          </view>
          <textarea 
            class="item-textarea" 
            v-model="formData.remark"
            placeholder="可说明行李情况、是否可带宠物、路线偏好等"
            placeholder-class="placeholder"
            :maxlength="200"
          />
          <view class="remark-count">{{ (formData.remark || '').length }}/200</view>
        </view>

        <!-- 是否允许拼单 -->
        <view class="form-item switch-item">
          <view class="item-label">
            允许拼单
          </view>
          <switch 
            :checked="formData.allow" 
            @change="onAllowChange"
            color="#36c66d"
          />
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tips">
        <view class="tips-title">温馨提示</view>
        <view class="tips-text">1. 请如实填写行程信息，确保乘客安全</view>
        <view class="tips-text">2. 出发前请与乘客确认上车地点</view>
        <view class="tips-text">3. 如行程有变，请及时取消或修改</view>
        <view class="tips-text">4. 请遵守交通规则，安全驾驶</view>
      </view>
    </scroll-view>

    <!-- 日期时间选择器 -->
    <picker-view 
      v-if="showDateTime" 
      class="picker-view"
      :value="dateTimeValue"
      @change="onDateTimeChange"
      @tap.stop
    >
      <picker-view-column>
        <view v-for="(year, idx) in years" :key="idx" class="picker-item">{{ year }}年</view>
      </picker-view-column>
      <picker-view-column>
        <view v-for="(month, idx) in months" :key="idx" class="picker-item">{{ month }}月</view>
      </picker-view-column>
      <picker-view-column>
        <view v-for="(day, idx) in days" :key="idx" class="picker-item">{{ day }}日</view>
      </picker-view-column>
      <picker-view-column>
        <view v-for="(hour, idx) in hours" :key="idx" class="picker-item">{{ hour }}时</view>
      </picker-view-column>
      <picker-view-column>
        <view v-for="(minute, idx) in minutes" :key="idx" class="picker-item">{{ minute }}分</view>
      </picker-view-column>
    </picker-view>

    <!-- 遮罩层 -->
    <view v-if="showDateTime" class="mask" @tap="closePicker"></view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    const now = new Date()
    return {
      showDateTime: false,
      formData: {
        startPlace: '',
        endPlace: '',
        departTime: null,
        departTimeDisplay: '',
        seatCount: null,
        seatCountDisplay: '',
        price: '',
        carInfo: '',
        carModel: '',
        carNumber: '',
        contact: '',
        remark: '',
        allow: true,
		creator:''//测试使用
      },
      seatOptions: ['1个座位', '2个座位', '3个座位', '4个座位', '5个座位', '6个座位'],
      
      // 日期时间选择器数据
      years: [],
      months: [],
      days: [],
      hours: [],
      minutes: [],
      dateTimeValue: [0, 0, 0, 8, 0],
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      currentDay: now.getDate(),
      currentHour: 8,
      currentMinute: 0
    }
  },
  
  onLoad() {
    this.initDateTimePicker()
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    initDateTimePicker() {
      // 生成年份（当前年到未来2年）
      const currentYear = new Date().getFullYear()
      for (let i = currentYear; i <= currentYear + 2; i++) {
        this.years.push(i)
      }
      // 生成月份
      for (let i = 1; i <= 12; i++) {
        this.months.push(i)
      }
      // 生成小时
      for (let i = 0; i < 24; i++) {
        this.hours.push(i)
      }
      // 生成分钟（0, 30）
      this.minutes = [0, 30]
      this.updateDays()
    },
    
    updateDays() {
      const year = this.years[this.dateTimeValue[0]]
      const month = this.months[this.dateTimeValue[1]]
      const dayCount = new Date(year, month, 0).getDate()
      this.days = []
      for (let i = 1; i <= dayCount; i++) {
        this.days.push(i)
      }
    },
    
    showDateTimePicker() {
      this.showDateTime = true
    },
    
    closePicker() {
      this.showDateTime = false
    },
    
    onDateTimeChange(e) {
      const val = e.detail.value
      this.dateTimeValue = val
      this.updateDays()
      
      const year = this.years[val[0]]
      const month = this.months[val[1]]
      const day = this.days[val[2]]
      const hour = this.hours[val[3]]
      const minute = this.minutes[val[4]]
      
      // 格式化为 LocalDateTime 格式
      const dateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
      const displayStr = `${year}年${month}月${day}日 ${hour}:${String(minute).padStart(2, '0')}`
      
      this.formData.departTime = dateTimeStr
      this.formData.departTimeDisplay = displayStr
    },
    
    onSeatChange(e) {
      const index = e.detail.value
      this.formData.seatCount = index + 1
      this.formData.seatCountDisplay = this.seatOptions[index]
    },
    
    onAllowChange(e) {
      this.formData.allow = e.detail.value
    },
    
    validateForm() {
      if (!this.formData.startPlace.trim()) {
        uni.showToast({ title: '请输入出发地', icon: 'none' })
        return false
      }
      if (!this.formData.endPlace.trim()) {
        uni.showToast({ title: '请输入目的地', icon: 'none' })
        return false
      }
      if (!this.formData.departTime) {
        uni.showToast({ title: '请选择出发时间', icon: 'none' })
        return false
      }
      if (!this.formData.seatCount) {
        uni.showToast({ title: '请选择剩余座位', icon: 'none' })
        return false
      }
      if (!this.formData.price) {
        uni.showToast({ title: '请输入拼车费用', icon: 'none' })
        return false
      }
      if (isNaN(parseFloat(this.formData.price)) || parseFloat(this.formData.price) <= 0) {
        uni.showToast({ title: '请输入有效的拼车费用', icon: 'none' })
        return false
      }
      if (!this.formData.contact || !/^1[3-9]\d{9}$/.test(this.formData.contact)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return false
      }
      return true
    },
    
    submitPublish() {
      if (!this.validateForm()) return
      
      const token = uni.getStorageSync('accessToken')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        }, 1500)
        return
      }
      
      const userId = uni.getStorageSync('userId')
      
      uni.showLoading({ title: '发布中...', mask: true })
      
      // 组装数据，字段名与后端 TripSaveReqVO 完全对应
      const requestData = {
        userId: Number(userId),
        startPlace: this.formData.startPlace.trim(),
        endPlace: this.formData.endPlace.trim(),
        departTime: this.formData.departTime,
        seatCount: this.formData.seatCount,
        price: parseFloat(this.formData.price),
        carInfo: this.formData.carInfo.trim(),
        carModel: this.formData.carModel.trim(),
        carNumber: this.formData.carNumber.trim(),
        contact: this.formData.contact.trim(),
        remark: this.formData.remark.trim(),
        allow: this.formData.allow,
     
        creator:Number(userId)  //测试使用
      }
      
      console.log('发布行程数据:', requestData)
      
      request({
        url: '/admin-api/trip/trip/create',
        method: 'POST',
        data: requestData
      }).then(res => {
        uni.hideLoading()
        if (res.code === 0) {
          uni.showToast({ 
            title: '发布成功', 
            icon: 'success',
            duration: 2000
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 2000)
        } else {
          uni.showToast({ title: res.msg || '发布失败', icon: 'none' })
        }
      }).catch(err => {
        uni.hideLoading()
        console.error('发布失败:', err)
        uni.showToast({ title: err.msg || '发布失败，请重试', icon: 'none' })
      })
    }
  }
}
</script>

<style scoped>
.container {
  background: #f5f7fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 48rpx;
  color: #333;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.publish-btn {
  background: #36c66d;
  color: #fff;
  padding: 12rpx 30rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
}

/* 表单容器 */
.form-container {
  flex: 1;
  padding: 20rpx;
}

/* 表单区块 */
.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.required {
  color: #ff4757;
  margin-right: 8rpx;
}

/* 表单项 */
.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.form-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 28rpx;
  color: #666;
  min-width: 140rpx;
}

.item-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
  padding: 0;
}

.item-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
}

.item-arrow {
  font-size: 36rpx;
  color: #ccc;
  margin-left: 20rpx;
}

.placeholder {
  color: #ccc;
}

/* 文本域 */
.textarea-item {
  flex-direction: column;
  align-items: flex-start;
  padding-bottom: 20rpx;
}

.textarea-item .item-label {
  margin-bottom: 20rpx;
}

.item-textarea {
  width: 100%;
  height: 200rpx;
  font-size: 28rpx;
  color: #333;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.remark-count {
  text-align: right;
  font-size: 24rpx;
  color: #ccc;
  margin-top: 10rpx;
}

/* 开关项 */
.switch-item {
  justify-content: space-between;
}

/* 温馨提示 */
.tips {
  background: #fff9e6;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-top: 20rpx;
  margin-bottom: 40rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff9800;
  margin-bottom: 20rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #999;
  line-height: 40rpx;
}

/* 选择器 */
.picker-view {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 500rpx;
  background: #fff;
  z-index: 100;
  border-radius: 30rpx 30rpx 0 0;
}

.picker-item {
  line-height: 80rpx;
  text-align: center;
  font-size: 32rpx;
}

.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}
</style>
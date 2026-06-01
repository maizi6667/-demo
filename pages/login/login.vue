<template>
  <view class="container">
    <view class="logo-area">
      <view class="logo">✓</view>
      <view class="title">欢迎登录</view>
      <view class="subtitle">请填写账号和密码登录</view>
    </view>

    <view class="form-group">
      <view class="input-label">账号</view>
      <input
        class="input"
        :class="{ 'input-error': usernameError }"
        type="text"
        placeholder="请输入账号"
        v-model="username"
        @input="onUsernameInput"
        maxlength="20"
      />
      <view class="error-msg" v-if="usernameError">{{ usernameError }}</view>
    </view>

    <view class="form-group">
      <view class="input-label">密码</view>
      <view class="password-wrapper">
        <input
          class="input"
          :class="{ 'input-error': passwordError }"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          v-model="password"
          @input="onPasswordInput"
          maxlength="20"
        />
        <view class="eye-icon" @click="toggleShowPassword">
          {{ showPassword ? '👁' : '🙈' }}
        </view>
      </view>
      <view class="error-msg" v-if="passwordError">{{ passwordError }}</view>
    </view>

    <button
      class="login-btn"
      :class="{ disabled: btnDisabled || isLogging }"
      @click="handleLogin"
      :disabled="btnDisabled || isLogging"
    >
      {{ isLogging ? '登录中...' : '登 录' }}
    </button>

    <view class="register-tip">
      <text>还没有账号？</text>
      <text class="link" @click="goToRegister">立即注册</text>
    </view>

    <view class="dev-tip">
      <text>开发环境：localhost:48080</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      username: '',
      password: '',
      usernameError: '',
      passwordError: '',
      btnDisabled: true,
      isLogging: false,
      showPassword: false
    }
  },
  onLoad() {
    const token = uni.getStorageSync('accessToken')
    if (token) {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }
  },
  methods: {
    onUsernameInput() {
      this.validateUsername(this.username)
      this.updateButtonState()
    },
    onPasswordInput() {
      this.validatePassword(this.password)
      this.updateButtonState()
    },
    validateUsername(username) {
      let error = ''
      if (!username || username.trim() === '') {
        error = '请输入账号'
      }
      this.usernameError = error
      return error === ''
    },
    validatePassword(password) {
      let error = ''
      if (!password || password.length === 0) {
        error = '请输入密码'
      }
      this.passwordError = error
      return error === ''
    },
    updateButtonState() {
      const usernameValid = this.username && this.username.trim().length > 0
      const pwdValid = this.password && this.password.length > 0
      this.btnDisabled = !usernameValid || !pwdValid
    },
    toggleShowPassword() {
      this.showPassword = !this.showPassword
    },
    handleLogin() {
      if (this.isLogging) return

      const usernameValid = this.validateUsername(this.username)
      const pwdValid = this.validatePassword(this.password)

      if (!usernameValid || !pwdValid) {
        uni.showToast({
          title: this.usernameError || this.passwordError || '请填写完整信息',
          icon: 'none'
        })
        return
      }

      this.isLogging = true
      uni.showLoading({ title: '登录中...', mask: true })

      const requestData = {
        tenantName: "芋道源码",
        username: this.username.trim(),
        password: this.password,
        rememberMe: true
      }
      
      console.log('请求数据:', requestData)

      uni.request({
        url: 'http://localhost:48080/admin-api/system/auth/login',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'tenant-id': '1'
        },
        data: requestData,
        success: (res) => {
          uni.hideLoading()
          
          console.log('响应数据:', res.data)
          
          // 根据返回的数据结构调整
          if (res.statusCode === 200 && res.data) {
            // 判断 code === 0 表示成功
            if (res.data.code === 0 && res.data.data) {
              const data = res.data.data
              const accessToken = data.accessToken
              const refreshToken = data.refreshToken
              const expiresTime = data.expiresTime
              const userId = data.userId
              
              if (!accessToken) {
                uni.showToast({
                  title: '登录异常，请重试',
                  icon: 'error'
                })
                return
              }
              
              try {
                // 存储 token
                uni.setStorageSync('accessToken', accessToken)
                uni.setStorageSync('refreshToken', refreshToken)
                uni.setStorageSync('expiresTime', expiresTime)
                uni.setStorageSync('userId', userId)
                uni.setStorageSync('tenantId', '1')
                
                // 存储用户信息
                uni.setStorageSync('userInfo', {
                  userId: userId,
                  username: this.username.trim()
                })
                
                console.log('登录成功，accessToken:', accessToken)
              } catch (e) {
                console.error('存储失败', e)
              }
              
              uni.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 1500
              })
              
              setTimeout(() => {
                uni.reLaunch({
                  url: '/pages/index/index'
                })
              }, 1500)
              
            } else {
              uni.showToast({
                title: res.data.msg || res.data.message || '登录失败',
                icon: 'error'
              })
            }
          } else {
            uni.showToast({
              title: '请求失败，请检查网络',
              icon: 'error'
            })
          }
        },
        fail: (err) => {
          uni.hideLoading()
          console.error('网络请求失败', err)
          uni.showToast({
            title: '网络异常，请稍后重试',
            icon: 'error'
          })
        },
        complete: () => {
          this.isLogging = false
        }
      })
    },
    goToRegister() {
      uni.navigateTo({
        url: '/pages/register/register'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 100rpx 60rpx;
  background: #fff;
  min-height: 100vh;
}

.logo-area {
  text-align: center;
  margin-bottom: 100rpx;
}

.logo {
  width: 140rpx;
  height: 140rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 70rpx;
  color: #fff;
  margin-bottom: 40rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
}

.form-group {
  margin-bottom: 40rpx;
}

.input-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.input {
  width: 100%;
  height: 96rpx;
  padding: 0 30rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 16rpx;
  font-size: 32rpx;
  box-sizing: border-box;
  background: #fafafa;
}

.input:focus {
  border-color: #07c160;
  background: #fff;
}

.input-error {
  border-color: #fa5151;
}

.error-msg {
  color: #fa5151;
  font-size: 24rpx;
  margin-top: 12rpx;
  margin-left: 20rpx;
}

.password-wrapper {
  position: relative;
  width: 100%;
}

.eye-icon {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 36rpx;
  color: #999;
  padding: 10rpx;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  border-radius: 48rpx;
  font-size: 36rpx;
  font-weight: 500;
  margin-top: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn.disabled {
  background: #b9f0cf;
  color: #fff;
}

.register-tip {
  text-align: center;
  margin-top: 60rpx;
  font-size: 28rpx;
  color: #999;
}

.link {
  color: #07c160;
  margin-left: 10rpx;
  font-weight: 500;
}

.dev-tip {
  text-align: center;
  margin-top: 80rpx;
  font-size: 22rpx;
  color: #ccc;
}
</style>
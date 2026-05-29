<template>
  <view class="container">
    <view class="logo-area">
      <view class="logo">✓</view>
      <view class="title">注册账号</view>
      <view class="subtitle">欢迎加入，请填写以下信息</view>
    </view>

    <view class="form-group">
      <view class="input-label">用户名</view>
      <input
        class="input"
        :class="{ 'input-error': userNameError }"
        type="text"
        placeholder="请输入用户名（3-20位）"
        v-model="userName"
        @input="onUserNameInput"
        maxlength="20"
      />
      <view class="error-msg" v-if="userNameError">{{ userNameError }}</view>
      <view class="hint" v-else>用户名支持字母、数字、下划线或中文</view>
    </view>

    <view class="form-group">
      <view class="input-label">密码</view>
      <view class="password-wrapper">
        <input
          class="input"
          :class="{ 'input-error': passwordError }"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码（6-20位）"
          v-model="userPassword"
          @input="onPasswordInput"
          maxlength="20"
        />
        <view class="eye-icon" @click="toggleShowPassword">
          {{ showPassword ? '👁' : '🙈' }}
        </view>
      </view>
      <view class="error-msg" v-if="passwordError">{{ passwordError }}</view>
      <view class="hint" v-else>密码长度至少6位</view>
    </view>

    <view class="form-group">
      <view class="input-label">确认密码</view>
      <view class="password-wrapper">
        <input
          class="input"
          :class="{ 'input-error': confirmPasswordError }"
          :type="showConfirmPassword ? 'text' : 'password'"
          placeholder="请再次输入密码"
          v-model="confirmPassword"
          @input="onConfirmPasswordInput"
          maxlength="20"
        />
        <view class="eye-icon" @click="toggleShowConfirmPassword">
          {{ showConfirmPassword ? '👁' : '🙈' }}
        </view>
      </view>
      <view class="error-msg" v-if="confirmPasswordError">{{ confirmPasswordError }}</view>
    </view>

    <button
      class="register-btn"
      :class="{ disabled: btnDisabled || isRegistering }"
      @click="handleRegister"
      :disabled="btnDisabled || isRegistering"
    >
      {{ isRegistering ? '注册中...' : '注 册' }}
    </button>

    <view class="login-tip">
      <text>已有账号？</text>
      <text class="link" @click="goToLogin">立即登录</text>
    </view>

    <view class="agreement">
      <text>注册即表示同意</text>
      <text class="link">《用户协议》</text>
      <text>和</text>
      <text class="link">《隐私政策》</text>
    </view>

    <view class="dev-tip">
      <text>开发环境：localhost:8080/user/register</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userName: '',
      userPassword: '',
      confirmPassword: '',
      userNameError: '',
      passwordError: '',
      confirmPasswordError: '',
      btnDisabled: true,
      isRegistering: false,
      showPassword: false,
      showConfirmPassword: false
    }
  },
  onLoad() {
    // 检查是否已登录
    const token = uni.getStorageSync('token')
    if (token) {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }
  },
  methods: {
    onUserNameInput() {
      this.validateUserName(this.userName)
      this.updateButtonState()
    },
    onPasswordInput() {
      this.validatePassword(this.userPassword)
      this.validateConfirmPassword(this.confirmPassword, this.userPassword)
      this.updateButtonState()
    },
    onConfirmPasswordInput() {
      this.validateConfirmPassword(this.confirmPassword, this.userPassword)
      this.updateButtonState()
    },
    validateUserName(userName) {
      let error = ''
      if (!userName || userName.trim() === '') {
        error = '请输入用户名'
      } else if (userName.length < 3) {
        error = '用户名长度至少3位'
      } else if (userName.length > 20) {
        error = '用户名长度不能超过20位'
      } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(userName)) {
        error = '用户名只能包含字母、数字、下划线或中文'
      }
      this.userNameError = error
      return error === ''
    },
    validatePassword(password) {
      let error = ''
      if (!password || password.length === 0) {
        error = '请输入密码'
      } else if (password.length < 6) {
        error = '密码长度至少6位'
      } else if (password.length > 20) {
        error = '密码长度不能超过20位'
      }
      this.passwordError = error
      return error === ''
    },
    validateConfirmPassword(confirmPwd, password) {
      let error = ''
      if (!confirmPwd || confirmPwd.length === 0) {
        error = '请再次输入密码'
      } else if (confirmPwd !== password) {
        error = '两次输入的密码不一致'
      }
      this.confirmPasswordError = error
      return error === ''
    },
    updateButtonState() {
      const userNameValid = this.userName && this.userName.trim().length >= 3
      const pwdValid = this.userPassword && this.userPassword.length >= 6
      const confirmValid = this.confirmPassword && this.confirmPassword === this.userPassword
      this.btnDisabled = !userNameValid || !pwdValid || !confirmValid
    },
    toggleShowPassword() {
      this.showPassword = !this.showPassword
    },
    toggleShowConfirmPassword() {
      this.showConfirmPassword = !this.showConfirmPassword
    },
    handleRegister() {
      if (this.isRegistering) return

      const userNameValid = this.validateUserName(this.userName)
      const pwdValid = this.validatePassword(this.userPassword)
      const confirmValid = this.validateConfirmPassword(this.confirmPassword, this.userPassword)

      if (!userNameValid || !pwdValid || !confirmValid) {
        uni.showToast({
          title: this.userNameError || this.passwordError || this.confirmPasswordError || '请正确填写注册信息',
          icon: 'none'
        })
        return
      }

      this.isRegistering = true
      uni.showLoading({ title: '注册中...', mask: true })

      uni.request({
        url: 'http://localhost:48080/user/register',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          userName: this.userName.trim(),
          userPassword: this.userPassword
        },
        success: (res) => {
          uni.hideLoading()
          console.log('注册响应:', res)

          if (res.statusCode === 200 && res.data) {
            if (res.data.code === 200 || res.data.success === true) {
              uni.showToast({
                title: '注册成功',
                icon: 'success',
                duration: 1500
              })

              if (res.data.data) {
                uni.setStorageSync('userInfo', res.data.data)
                if (res.data.data.token) {
                  uni.setStorageSync('token', res.data.data.token)
                }
              }

              setTimeout(() => {
                uni.navigateBack({
                  delta: 1,
                  fail: () => {
                    uni.redirectTo({
                      url: '/pages/login/login'
                    })
                  }
                })
              }, 1500)
            } else if (res.statusCode === 409) {
              uni.showToast({
                title: '用户名已存在',
                icon: 'error'
              })
            } else {
              uni.showToast({
                title: res.data.message || res.data.msg || '注册失败',
                icon: 'error'
              })
            }
          } else if (res.statusCode === 400) {
            uni.showToast({
              title: '请求参数错误',
              icon: 'error'
            })
          } else {
            uni.showToast({
              title: '注册失败，请稍后重试',
              icon: 'error'
            })
          }
        },
        fail: (err) => {
          uni.hideLoading()
          console.error('请求失败:', err)
          uni.showToast({
            title: '网络错误，请检查后端服务是否启动',
            icon: 'error',
            duration: 2000
          })
        },
        complete: () => {
          this.isRegistering = false
        }
      })
    },
    goToLogin() {
      uni.navigateBack({
        delta: 1,
        fail: () => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 60rpx 60rpx 80rpx;
  background: #fff;
  min-height: 100vh;
}

.logo-area {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  color: #fff;
  margin-bottom: 30rpx;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
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
  height: 88rpx;
  padding: 0 30rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 16rpx;
  font-size: 30rpx;
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

.hint {
  color: #aaa;
  font-size: 22rpx;
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

.register-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  border-radius: 48rpx;
  font-size: 34rpx;
  font-weight: 500;
  margin-top: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-btn.disabled {
  background: #b9f0cf;
  color: #fff;
}

.login-tip {
  text-align: center;
  margin-top: 50rpx;
  font-size: 28rpx;
  color: #999;
}

.link {
  color: #07c160;
  margin-left: 8rpx;
  font-weight: 500;
}

.agreement {
  text-align: center;
  margin-top: 60rpx;
  font-size: 24rpx;
  color: #aaa;
}

.agreement .link {
  margin: 0 4rpx;
}

.dev-tip {
  text-align: center;
  margin-top: 60rpx;
  font-size: 22rpx;
  color: #ccc;
}
</style>
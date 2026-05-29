// utils/request.js
const BASE_URL = 'http://localhost:48080'
const DEFAULT_TENANT_ID = '1'

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('accessToken')
    const tenantId = uni.getStorageSync('tenantId') || DEFAULT_TENANT_ID
    
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    if (token) {
      header['Authorization'] = 'Bearer ' + token
    }
    header['tenant-id'] = tenantId
    
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          // ⭐ 兼容 code = 0 或 200
          if (res.data.code === 0 || res.data.code === 200) {
            resolve(res.data)
          } else if (res.data.code === 401) {
            uni.removeStorageSync('accessToken')
            uni.removeStorageSync('userInfo')
            uni.reLaunch({ url: '/pages/login/login' })
            reject(res.data)
          } else {
            reject(res.data)
          }
        } else {
          reject(res)
        }
      },
      fail: (err) => reject(err)
    })
  })
}

export default request
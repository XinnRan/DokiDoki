/**
 * Electron预加载脚本
 * 用于在渲染进程和主进程之间建立安全的通信桥梁
 */
const { contextBridge, ipcRenderer } = require('electron')

console.log('preload.js 加载成功')

/**
 * 暴露给渲染进程的API
 * 统一使用 electronAPI 作为全局 API 名称
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // ========== 蓝牙相关方法 ==========
    /**
     * 开始扫描蓝牙设备
     * @returns {Promise<Object>} 扫描结果
     */
    startScan: async () => {
        console.log('preload: startScan 被调用')
        const result = await ipcRenderer.invoke('bluetooth:scan')
        console.log('preload: startScan 返回:', result)
        return result
    },
    
    /**
     * 获取已发现的设备列表
     * @returns {Promise<Array>} 设备列表
     */
    getDevices: async () => {
        console.log('preload: getDevices 被调用')
        const result = await ipcRenderer.invoke('bluetooth:getDevices')
        console.log('preload: getDevices 返回:', result)
        return result.devices
    },
    
    /**
     * 连接到指定设备
     * @param {string} deviceId 设备ID
     * @returns {Promise<Object>} 连接结果
     */
    connectDevice: async (deviceId) => {
        console.log('preload: connectDevice 被调用，设备ID:', deviceId)
        const result = await ipcRenderer.invoke('bluetooth:connect', deviceId)
        console.log('preload: connectDevice 返回:', result)
        return result
    },
    
    /**
     * 断开当前连接
     * @returns {Promise<Object>} 断开结果
     */
    disconnectDevice: async () => {
        console.log('preload: disconnectDevice 被调用')
        const result = await ipcRenderer.invoke('bluetooth:disconnect')
        console.log('preload: disconnectDevice 返回:', result)
        return result
    },
    
    /**
     * 获取当前扫描状态
     * @returns {Promise<boolean>} 是否正在扫描
     */
    isScanning: async () => {
        console.log('preload: isScanning 被调用')
        const result = await ipcRenderer.invoke('bluetooth:isScanning')
        console.log('preload: isScanning 返回:', result)
        return result.scanning
    },
    
    // ========== 悬浮窗口相关方法 ==========
    /**
     * 切换悬浮窗口显示/隐藏
     * @returns {Promise<Object>} 切换结果
     */
    toggleFloatingWindow: async () => {
        console.log('preload: toggleFloatingWindow 被调用')
        const result = await ipcRenderer.invoke('bluetooth:toggleFloatingWindow')
        console.log('preload: toggleFloatingWindow 返回:', result)
        return result
    },
    
    /**
     * 获取悬浮窗口设置
     * @returns {Promise<Object>} 悬浮窗口设置
     */
    getFloatingWindowSettings: async () => {
        console.log('preload: getFloatingWindowSettings 被调用')
        const result = await ipcRenderer.invoke('bluetooth:getFloatingWindowSettings')
        console.log('preload: getFloatingWindowSettings 返回:', result)
        return result
    },
    
    /**
     * 更新悬浮窗口设置
     * @param {Object} settings 新的设置
     * @returns {Promise<Object>} 更新结果
     */
    updateFloatingWindowSettings: async (settings) => {
        console.log('preload: updateFloatingWindowSettings 被调用，设置:', settings)
        const result = await ipcRenderer.invoke('bluetooth:updateFloatingWindowSettings', settings)
        console.log('preload: updateFloatingWindowSettings 返回:', result)
        return result
    },
    
    /**
     * 移动悬浮窗口
     * @param {Object} position 位置偏移
     */
    moveFloatingWindow: (position) => {
        console.log('preload: moveFloatingWindow 被调用，位置:', position)
        ipcRenderer.send('floating-window:move', position)
    },
    
    // ========== 监听主进程消息 ==========
    // 蓝牙事件
    /**
     * 监听设备发现事件
     * @param {Function} callback 回调函数
     */
    onDeviceFound: (callback) => {
        console.log('preload: onDeviceFound 被调用')
        ipcRenderer.on('bluetooth:deviceFound', (event, data) => {
            console.log('preload: 收到 bluetooth:deviceFound 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听设备更新事件
     * @param {Function} callback 回调函数
     */
    onDeviceUpdated: (callback) => {
        console.log('preload: onDeviceUpdated 被调用')
        ipcRenderer.on('bluetooth:deviceUpdated', (event, data) => {
            console.log('preload: 收到 bluetooth:deviceUpdated 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听扫描状态变化事件
     * @param {Function} callback 回调函数
     */
    onScanState: (callback) => {
        console.log('preload: onScanState 被调用')
        ipcRenderer.on('bluetooth:scanState', (event, data) => {
            console.log('preload: 收到 bluetooth:scanState 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听扫描完成事件
     * @param {Function} callback 回调函数
     */
    onScanComplete: (callback) => {
        console.log('preload: onScanComplete 被调用')
        ipcRenderer.on('bluetooth:scanComplete', (event, data) => {
            console.log('preload: 收到 bluetooth:scanComplete 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听心率数据事件
     * @param {Function} callback 回调函数
     */
    onHeartRateData: (callback) => {
        console.log('preload: onHeartRateData 被调用')
        ipcRenderer.on('heart-rate:data', (event, data) => {
            console.log('preload: 收到 heart-rate:data 事件:', data)
            callback(data)
        })
    },
    
    // 悬浮窗口事件
    /**
     * 监听悬浮窗口心率数据事件
     * @param {Function} callback 回调函数
     */
    onFloatingWindowHeartRate: (callback) => {
        console.log('preload: onFloatingWindowHeartRate 被调用')
        ipcRenderer.on('floating-window:heart-rate', (event, data) => {
            console.log('preload: 收到 floating-window:heart-rate 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听悬浮窗口样式更新事件
     * @param {Function} callback 回调函数
     */
    onFloatingWindowUpdateStyle: (callback) => {
        console.log('preload: onFloatingWindowUpdateStyle 被调用')
        ipcRenderer.on('floating-window:update-style', (event, data) => {
            console.log('preload: 收到 floating-window:update-style 事件:', data)
            callback(data)
        })
    },
    
    /**
     * 监听悬浮窗口设置更新事件
     * @param {Function} callback 回调函数
     */
    onFloatingWindowSettingsUpdated: (callback) => {
        console.log('preload: onFloatingWindowSettingsUpdated 被调用')
        ipcRenderer.on('bluetooth:floatingWindowSettingsUpdated', (event, data) => {
            console.log('preload: 收到 bluetooth:floatingWindowSettingsUpdated 事件:', data)
            callback(data)
        })
    },
    
    // ========== 移除监听方法 ==========
    /**
     * 移除指定通道的监听器
     * @param {string} channel 通道名称
     * @param {Function} callback 回调函数
     */
    removeMessageListener: (channel, callback) => {
        console.log('preload: removeMessageListener 被调用，通道:', channel)
        ipcRenderer.removeListener(channel, callback)
    },
    
    /**
     * 移除指定通道的所有监听器
     * @param {string} channel 通道名称
     */
    removeAllListeners: (channel) => {
        console.log('preload: removeAllListeners 被调用，通道:', channel)
        ipcRenderer.removeAllListeners(channel)
    },
    
    // ========== 测试方法 ==========
    /**
     * 测试方法
     * @returns {string} 测试结果
     */
    test: () => {
        console.log('preload: test 方法被调用')
        return 'test 方法返回成功'
    }
})

console.log('preload.js API 暴露完成')
const { contextBridge, ipcRenderer } = require('electron')

console.log('preload.js 加载成功')

// ⭐ 统一使用 electronAPI 作为全局 API 名称
contextBridge.exposeInMainWorld('electronAPI', {
    // ========== 蓝牙相关 ==========
    startScan: async () => {
        console.log('preload: startScan 被调用')
        const result = await ipcRenderer.invoke('bluetooth:scan')
        console.log('preload: startScan 返回:', result)
        return result
    },
    
    getDevices: async () => {
        console.log('preload: getDevices 被调用')
        const result = await ipcRenderer.invoke('bluetooth:getDevices')
        console.log('preload: getDevices 返回:', result)
        return result.devices
    },
    
    connectDevice: async (deviceId) => {
        console.log('preload: connectDevice 被调用，设备ID:', deviceId)
        const result = await ipcRenderer.invoke('bluetooth:connect', deviceId)
        console.log('preload: connectDevice 返回:', result)
        return result
    },
    
    disconnectDevice: async () => {
        console.log('preload: disconnectDevice 被调用')
        const result = await ipcRenderer.invoke('bluetooth:disconnect')
        console.log('preload: disconnectDevice 返回:', result)
        return result
    },
    
    isScanning: async () => {
        console.log('preload: isScanning 被调用')
        const result = await ipcRenderer.invoke('bluetooth:isScanning')
        console.log('preload: isScanning 返回:', result)
        return result.scanning
    },
    
    // ========== 悬浮窗口相关 ==========
    toggleFloatingWindow: async () => {
        console.log('preload: toggleFloatingWindow 被调用')
        const result = await ipcRenderer.invoke('bluetooth:toggleFloatingWindow')
        console.log('preload: toggleFloatingWindow 返回:', result)
        return result
    },
    
    // ⭐ 添加：获取悬浮窗口设置
    getFloatingWindowSettings: async () => {
        console.log('preload: getFloatingWindowSettings 被调用')
        const result = await ipcRenderer.invoke('bluetooth:getFloatingWindowSettings')
        console.log('preload: getFloatingWindowSettings 返回:', result)
        return result
    },
    
    updateFloatingWindowSettings: async (settings) => {
        console.log('preload: updateFloatingWindowSettings 被调用，设置:', settings)
        const result = await ipcRenderer.invoke('bluetooth:updateFloatingWindowSettings', settings)
        console.log('preload: updateFloatingWindowSettings 返回:', result)
        return result
    },
    
    moveFloatingWindow: (position) => {
        console.log('preload: moveFloatingWindow 被调用，位置:', position)
        ipcRenderer.send('floating-window:move', position)
    },
    
    // ========== 监听主进程消息 ==========
    // 蓝牙事件
    onDeviceFound: (callback) => {
        console.log('preload: onDeviceFound 被调用')
        ipcRenderer.on('bluetooth:deviceFound', (event, data) => {
            console.log('preload: 收到 bluetooth:deviceFound 事件:', data)
            callback(data)
        })
    },
    
    onDeviceUpdated: (callback) => {
        console.log('preload: onDeviceUpdated 被调用')
        ipcRenderer.on('bluetooth:deviceUpdated', (event, data) => {
            console.log('preload: 收到 bluetooth:deviceUpdated 事件:', data)
            callback(data)
        })
    },
    
    onScanState: (callback) => {
        console.log('preload: onScanState 被调用')
        ipcRenderer.on('bluetooth:scanState', (event, data) => {
            console.log('preload: 收到 bluetooth:scanState 事件:', data)
            callback(data)
        })
    },
    
    onScanComplete: (callback) => {
        console.log('preload: onScanComplete 被调用')
        ipcRenderer.on('bluetooth:scanComplete', (event, data) => {
            console.log('preload: 收到 bluetooth:scanComplete 事件:', data)
            callback(data)
        })
    },
    
    onHeartRateData: (callback) => {
        console.log('preload: onHeartRateData 被调用')
        ipcRenderer.on('heart-rate:data', (event, data) => {
            console.log('preload: 收到 heart-rate:data 事件:', data)
            callback(data)
        })
    },
    
    // 悬浮窗口事件
    onFloatingWindowHeartRate: (callback) => {
        console.log('preload: onFloatingWindowHeartRate 被调用')
        ipcRenderer.on('floating-window:heart-rate', (event, data) => {
            console.log('preload: 收到 floating-window:heart-rate 事件:', data)
            callback(data)
        })
    },
    
    onFloatingWindowUpdateStyle: (callback) => {
        console.log('preload: onFloatingWindowUpdateStyle 被调用')
        ipcRenderer.on('floating-window:update-style', (event, data) => {
            console.log('preload: 收到 floating-window:update-style 事件:', data)
            callback(data)
        })
    },
    
    // ⭐ 添加：监听设置更新
    onFloatingWindowSettingsUpdated: (callback) => {
        console.log('preload: onFloatingWindowSettingsUpdated 被调用')
        ipcRenderer.on('bluetooth:floatingWindowSettingsUpdated', (event, data) => {
            console.log('preload: 收到 bluetooth:floatingWindowSettingsUpdated 事件:', data)
            callback(data)
        })
    },
    
    // ========== 移除监听 ==========
    removeMessageListener: (channel, callback) => {
        console.log('preload: removeMessageListener 被调用，通道:', channel)
        ipcRenderer.removeListener(channel, callback)
    },
    
    removeAllListeners: (channel) => {
        console.log('preload: removeAllListeners 被调用，通道:', channel)
        ipcRenderer.removeAllListeners(channel)
    },
    
    // ========== 测试方法 ==========
    test: () => {
        console.log('preload: test 方法被调用')
        return 'test 方法返回成功'
    }
})

console.log('preload.js API 暴露完成')
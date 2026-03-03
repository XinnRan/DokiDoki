/**
 * Electron主进程文件
 * 负责创建窗口、蓝牙设备管理、悬浮窗口控制等核心功能
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'  // 使用 ES6 import
import noble from '@abandonware/noble'  // 蓝牙设备扫描和连接库

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局窗口变量
let mainWindow = null  // 主窗口
let floatingWindow = null  // 悬浮窗口

// 应用就绪时创建窗口
app.whenReady().then(() => {
    createMainWindow()  // 创建主窗口
    setupBluetooth()  // 初始化蓝牙
})

// ========== 蓝牙设备管理 ==========
let bluetoothDevices = []  // 发现的蓝牙设备列表
let scanning = false  // 是否正在扫描
let selectedDevice = null  // 当前选中的设备
let peripheralMap = new Map()  // 设备ID到设备对象的映射

// ========== 悬浮窗口设置 ==========
let floatingWindowSettings = {
    mouseThrough: false,  // 鼠标穿透
    opacity: 0.9,  // 透明度
    alwaysOnTop: true,  // 始终置顶
    style: 'simple'  // 显示样式
}

let floatingWindowVisible = false  // 悬浮窗口是否可见

// ========== 窗口创建 ==========

/**
 * 创建主窗口
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 400,  // 窗口宽度
        height: 600,  // 窗口高度
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),  // 预加载脚本
            contextIsolation: true,  // 启用上下文隔离
            nodeIntegration: false  // 禁用节点集成
        }
    })
    
    const isDev = !app.isPackaged  // 判断是否为开发模式
    console.log('启动模式:', isDev ? '开发' : '生产')
    
    if (isDev) {
        // 开发模式
        mainWindow.loadURL('http://localhost:5173')  // 加载开发服务器
        // 禁用自动打开开发者工具
        // mainWindow.webContents.openDevTools()
    } else {
        // 生产模式
        const distPath = path.join(__dirname, '../dist/index.html')  // 构建后的文件路径
        console.log('加载文件:', distPath)
        console.log('文件存在:', existsSync(distPath))
        
        if (existsSync(distPath)) {
            mainWindow.loadFile(distPath)  // 加载构建后的文件
        } else {
            // 备用路径（asar 包内）
            const appPath = app.getAppPath()
            const fallbackPath = path.join(appPath, 'dist/index.html')
            console.log('备用路径:', fallbackPath)
            console.log('备用路径存在:', existsSync(fallbackPath))
            
            if (existsSync(fallbackPath)) {
                mainWindow.loadFile(fallbackPath)
            } else {
                console.error('❌ 找不到 index.html')
            }
        }
        
        // 生产模式不打开 DevTools
        // mainWindow.webContents.openDevTools()
    }
    
    // 主窗口关闭事件
    mainWindow.on('closed', () => {
        // 关闭悬浮窗口
        if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.close()
        }
        mainWindow = null
        app.quit()  // 退出应用
    })
}

/**
 * 创建悬浮窗口
 * @returns {BrowserWindow|null} 悬浮窗口实例
 */
function createFloatingWindow() {
    // 如果悬浮窗口已存在且未被销毁，直接返回
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        return floatingWindow
    }
    
    try {
        floatingWindow = new BrowserWindow({
            width: 120,  // 宽度
            height: 80,  // 高度
            frame: false,  // 无边框
            transparent: true,  // 透明背景
            resizable: false,  // 不可调整大小
            movable: true,  // 可移动
            alwaysOnTop: floatingWindowSettings.alwaysOnTop,  // 始终置顶
            skipTaskbar: true,  // 不在任务栏显示
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),  // 预加载脚本
                contextIsolation: true,  // 启用上下文隔离
                nodeIntegration: false,  // 禁用节点集成
                backgroundThrottling: false  // 禁用后台节流
            }
        })
        
        applyFloatingWindowSettings()  // 应用悬浮窗口设置
        console.log('创建悬浮窗口成功')
    } catch (error) {
        console.error('创建悬浮窗口失败:', error)
        floatingWindow = null
    }
    
    if (!floatingWindow) {
        return null
    }
    
    // 当前悬浮窗口样式
    const currentStyle = floatingWindowSettings.style
    
    // 悬浮窗口HTML内容
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; overflow: hidden; font-family: 'Microsoft YaHei', sans-serif; user-select: none; width: 120px; height: 80px; }
        .floating-window { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: move; }
        .floating-window.simple { background: rgba(231, 76, 60, 0.9); color: white; }
        .floating-window.modern { background: rgba(52, 152, 219, 0.9); color: white; border-radius: 50%; }
        .floating-window.digital { background: rgba(44, 62, 80, 0.9); color: #2ecc71; font-family: monospace; border: 2px solid #34495e; }
        .floating-window.minimal { background: transparent; color: #333; border: 2px solid #333; }
        .heart-rate { font-size: 24px; font-weight: bold; text-align: center; }
        .unit { font-size: 12px; margin-left: 2px; }
    </style>
</head>
<body>
    <div class="floating-window ${currentStyle}" id="fw">
        <div class="heart-rate"><span id="hr">--</span><span class="unit">BPM</span></div>
    </div>
    <script>
        const hr = document.getElementById('hr');
        const fw = document.getElementById('fw');
        // 监听心率数据
        window.electronAPI?.onFloatingWindowHeartRate((data) => { hr.textContent = data.bpm; });
        // 监听样式更新
        window.electronAPI?.onFloatingWindowUpdateStyle((style) => { fw.className = 'floating-window ' + style; });
        // 拖拽功能
        let dragging = false, lastX = 0, lastY = 0;
        document.addEventListener('mousedown', (e) => { dragging = true; lastX = e.screenX; lastY = e.screenY; });
        document.addEventListener('mousemove', (e) => { if (dragging) { window.electronAPI?.moveFloatingWindow({ deltaX: e.screenX - lastX, deltaY: e.screenY - lastY }); lastX = e.screenX; lastY = e.screenY; } });
        document.addEventListener('mouseup', () => { dragging = false; });
    </script>
</body>
</html>`
    
    try {
        // 加载悬浮窗口HTML
        floatingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
        
        // 悬浮窗口关闭事件
        floatingWindow.on('closed', () => {
            floatingWindow = null
            floatingWindowVisible = false
        })
        
        return floatingWindow
    } catch (error) {
        console.error('加载悬浮窗口 HTML 失败:', error)
        if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.close()
        }
        floatingWindow = null
        return null
    }
}

/**
 * 应用悬浮窗口设置
 */
function applyFloatingWindowSettings() {
    if (!floatingWindow || floatingWindow.isDestroyed()) return
    
    try {
        floatingWindow.setOpacity(floatingWindowSettings.opacity)  // 设置透明度
        floatingWindow.setIgnoreMouseEvents(floatingWindowSettings.mouseThrough, { forward: true })  // 设置鼠标穿透
        floatingWindow.setAlwaysOnTop(floatingWindowSettings.alwaysOnTop, 'screen-saver')  // 设置始终置顶
        console.log('应用悬浮窗设置:', floatingWindowSettings)
    } catch (error) {
        console.error('应用悬浮窗设置失败:', error)
    }
}

/**
 * 切换悬浮窗口显示/隐藏
 * @returns {boolean} 悬浮窗口当前状态
 */
function toggleFloatingWindow() {
    if (floatingWindowVisible) {
        // 隐藏悬浮窗口
        if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.hide()
        }
        floatingWindowVisible = false
    } else {
        // 显示悬浮窗口
        const win = createFloatingWindow()
        if (win && !win.isDestroyed()) {
            win.show()
            floatingWindowVisible = true
        }
    }
    return floatingWindowVisible
}

/**
 * 向悬浮窗口发送心率数据
 * @param {number} bpm 心率值
 */
function sendHeartRateToFloatingWindow(bpm) {
    if (floatingWindow && floatingWindowVisible && !floatingWindow.isDestroyed()) {
        floatingWindow.webContents.send('floating-window:heart-rate', { bpm })
    }
}

/**
 * 向渲染进程发送消息
 * @param {string} channel 通道名称
 * @param {any} data 数据
 */
function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
        if (!win.isDestroyed() && win !== floatingWindow) {
            win.webContents.send(channel, data)
        }
    })
}

// ========== 蓝牙功能 ==========

/**
 * 初始化蓝牙
 */
function setupBluetooth() {
    // 蓝牙状态变化监听
    noble.on('stateChange', (state) => {
        console.log('蓝牙状态:', state)
    })

    // 发现设备监听
    noble.on('discover', (peripheral) => {
        const serviceUuids = peripheral.advertisement?.serviceUuids || []
        // 检查是否包含心率服务（UUID: 180d）
        const hasHeartRate = serviceUuids.some(uuid => uuid.toLowerCase().includes('180d'))
        if (!hasHeartRate) return
        
        const name = peripheral.advertisement?.localName || peripheral.name || '未知设备'
        const existingIndex = bluetoothDevices.findIndex(d => d.id === peripheral.id)
        
        if (existingIndex === -1) {
            // 新设备
            bluetoothDevices.push({ id: peripheral.id, name, rssi: peripheral.rssi, connectable: peripheral.connectable })
            peripheralMap.set(peripheral.id, peripheral)
            sendToRenderer('bluetooth:deviceFound', bluetoothDevices[bluetoothDevices.length - 1])
        } else {
            // 设备更新
            bluetoothDevices[existingIndex].rssi = peripheral.rssi
            sendToRenderer('bluetooth:deviceUpdated', bluetoothDevices[existingIndex])
        }
    })

    // 扫描开始监听
    noble.on('scanStart', () => {
        scanning = true
        sendToRenderer('bluetooth:scanState', { scanning: true })
    })

    // 扫描停止监听
    noble.on('scanStop', () => {
        scanning = false
        sendToRenderer('bluetooth:scanState', { scanning: false })
        sendToRenderer('bluetooth:scanComplete', { devices: bluetoothDevices })
    })
}

// ========== IPC 通信 ==========

// 开始扫描设备
ipcMain.handle('bluetooth:scan', async () => {
    bluetoothDevices = []
    peripheralMap.clear()
    if (noble.state === 'poweredOn') {
        noble.startScanning([], true)  // 开始扫描
        // 5秒后停止扫描
        setTimeout(() => { if (scanning) noble.stopScanning() }, 5000)
        return { success: true, message: '开始扫描' }
    }
    return { success: false, message: '蓝牙未开启' }
})

// 获取设备列表
ipcMain.handle('bluetooth:getDevices', () => {
    // 按信号强度排序
    return { success: true, devices: [...bluetoothDevices].sort((a, b) => b.rssi - a.rssi) }
})

// 连接设备
ipcMain.handle('bluetooth:connect', async (event, deviceId) => {
    const peripheral = peripheralMap.get(deviceId)
    if (!peripheral) return { success: false, message: '设备不存在' }
    
    try {
        // 停止扫描
        if (scanning) { noble.stopScanning(); await new Promise(r => setTimeout(r, 500)) }
        
        // 连接设备
        await new Promise((resolve, reject) => {
            peripheral.connect((error) => error ? reject(error) : resolve())
        })
        selectedDevice = peripheral
        
        // 发现心率服务和特征
        await new Promise((resolve, reject) => {
            peripheral.discoverServices(['180d'], (error, services) => {
                if (error || services.length === 0) { reject(new Error('未找到心率服务')); return }
                services.forEach(service => {
                    service.discoverCharacteristics(['2a37'], (error, characteristics) => {
                        if (error || characteristics.length === 0) return
                        characteristics.forEach(char => {
                            char.subscribe(() => {})
                            // 监听心率数据
                            char.on('data', (data) => {
                                const flags = data.readUInt8(0)
                                // 根据flags解析心率值
                                const bpm = (flags & 0x01) === 0 ? data.readUInt8(1) : data.readUInt16LE(1)
                                event.sender.send('heart-rate:data', { bpm, timestamp: Date.now() })
                                sendHeartRateToFloatingWindow(bpm)
                            })
                        })
                    })
                })
                resolve()
            })
        })
        
        return { success: true, message: '连接成功' }
    } catch (error) {
        if (selectedDevice) { selectedDevice.disconnect(); selectedDevice = null }
        return { success: false, message: error.message }
    }
})

// 断开连接
ipcMain.handle('bluetooth:disconnect', async () => {
    if (selectedDevice) {
        await new Promise((resolve, reject) => {
            selectedDevice.disconnect((error) => error ? reject(error) : resolve())
        })
        selectedDevice = null
    }
    return { success: true, message: '断开成功' }
})

// 获取扫描状态
ipcMain.handle('bluetooth:isScanning', () => ({ scanning }))

// 切换悬浮窗口
ipcMain.handle('bluetooth:toggleFloatingWindow', () => {
    const visible = toggleFloatingWindow()
    return { success: true, visible }
})

// 获取悬浮窗口设置
ipcMain.handle('bluetooth:getFloatingWindowSettings', () => {
    return { success: true, settings: floatingWindowSettings }
})

// 更新悬浮窗口设置
ipcMain.handle('bluetooth:updateFloatingWindowSettings', (event, settings) => {
    console.log('收到设置更新:', settings)
    floatingWindowSettings = { ...floatingWindowSettings, ...settings }
    console.log('新设置:', floatingWindowSettings)
    applyFloatingWindowSettings()
    
    // 更新悬浮窗口样式
    if (floatingWindow && floatingWindowVisible && !floatingWindow.isDestroyed()) {
        floatingWindow.webContents.send('floating-window:update-style', floatingWindowSettings.style)
    }
    
    // 通知渲染进程设置已更新
    sendToRenderer('bluetooth:floatingWindowSettingsUpdated', floatingWindowSettings)
    return { success: true, settings: floatingWindowSettings }
})

// 移动悬浮窗口
ipcMain.on('floating-window:move', (event, position) => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        const [x, y] = floatingWindow.getPosition()
        floatingWindow.setPosition(x + position.deltaX, y + position.deltaY)
    }
})

// 应用退出前清理
app.on('will-quit', () => {
    if (selectedDevice) selectedDevice.disconnect()
    if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.close()
    noble.stopScanning()
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
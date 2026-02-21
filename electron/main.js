import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'  // ⭐ 使用 ES6 import
import noble from '@abandonware/noble'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let floatingWindow = null

app.whenReady().then(() => {
    createMainWindow()
    setupBluetooth()
})

// 蓝牙设备管理
let bluetoothDevices = []
let scanning = false
let selectedDevice = null
let peripheralMap = new Map()

let floatingWindowSettings = {
    mouseThrough: false,
    opacity: 0.9,
    alwaysOnTop: true,
    style: 'simple'
}

let floatingWindowVisible = false

// ========== 窗口创建 ==========

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })
    
    const isDev = !app.isPackaged
    console.log('启动模式:', isDev ? '开发' : '生产')
    
    if (isDev) {
        // 开发模式
        mainWindow.loadURL('http://localhost:5173')
        // 禁用自动打开开发者工具
        // mainWindow.webContents.openDevTools()
    } else {
        // ⭐ 生产模式 - 简化路径处理
        const distPath = path.join(__dirname, '../dist/index.html')
        console.log('加载文件:', distPath)
        console.log('文件存在:', existsSync(distPath))
        
        if (existsSync(distPath)) {
            mainWindow.loadFile(distPath)
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
    
    mainWindow.on('closed', () => {
        if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.close()
        }
        mainWindow = null
        app.quit()
    })
}

function createFloatingWindow() {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        return floatingWindow
    }
    
    try {
        floatingWindow = new BrowserWindow({
            width: 120,
            height: 80,
            frame: false,
            transparent: true,
            resizable: false,
            movable: true,
            alwaysOnTop: floatingWindowSettings.alwaysOnTop,
            skipTaskbar: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                backgroundThrottling: false
            }
        })
        
        applyFloatingWindowSettings()
        console.log('创建悬浮窗口成功')
    } catch (error) {
        console.error('创建悬浮窗口失败:', error)
        floatingWindow = null
    }
    
    if (!floatingWindow) {
        return null
    }
    
    const currentStyle = floatingWindowSettings.style
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
        window.electronAPI?.onFloatingWindowHeartRate((data) => { hr.textContent = data.bpm; });
        window.electronAPI?.onFloatingWindowUpdateStyle((style) => { fw.className = 'floating-window ' + style; });
        let dragging = false, lastX = 0, lastY = 0;
        document.addEventListener('mousedown', (e) => { dragging = true; lastX = e.screenX; lastY = e.screenY; });
        document.addEventListener('mousemove', (e) => { if (dragging) { window.electronAPI?.moveFloatingWindow({ deltaX: e.screenX - lastX, deltaY: e.screenY - lastY }); lastX = e.screenX; lastY = e.screenY; } });
        document.addEventListener('mouseup', () => { dragging = false; });
    </script>
</body>
</html>`
    
    try {
        floatingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
        
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

function applyFloatingWindowSettings() {
    if (!floatingWindow || floatingWindow.isDestroyed()) return
    
    try {
        floatingWindow.setOpacity(floatingWindowSettings.opacity)
        floatingWindow.setIgnoreMouseEvents(floatingWindowSettings.mouseThrough, { forward: true })
        floatingWindow.setAlwaysOnTop(floatingWindowSettings.alwaysOnTop, 'screen-saver')
        console.log('应用悬浮窗设置:', floatingWindowSettings)
    } catch (error) {
        console.error('应用悬浮窗设置失败:', error)
    }
}

function toggleFloatingWindow() {
    if (floatingWindowVisible) {
        if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.hide()
        }
        floatingWindowVisible = false
    } else {
        const win = createFloatingWindow()
        if (win && !win.isDestroyed()) {
            win.show()
            floatingWindowVisible = true
        }
    }
    return floatingWindowVisible
}

function sendHeartRateToFloatingWindow(bpm) {
    if (floatingWindow && floatingWindowVisible && !floatingWindow.isDestroyed()) {
        floatingWindow.webContents.send('floating-window:heart-rate', { bpm })
    }
}

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
        if (!win.isDestroyed() && win !== floatingWindow) {
            win.webContents.send(channel, data)
        }
    })
}

// ========== 蓝牙 ==========

function setupBluetooth() {
    noble.on('stateChange', (state) => {
        console.log('蓝牙状态:', state)
    })

    noble.on('discover', (peripheral) => {
        const serviceUuids = peripheral.advertisement?.serviceUuids || []
        const hasHeartRate = serviceUuids.some(uuid => uuid.toLowerCase().includes('180d'))
        if (!hasHeartRate) return
        
        const name = peripheral.advertisement?.localName || peripheral.name || '未知设备'
        const existingIndex = bluetoothDevices.findIndex(d => d.id === peripheral.id)
        
        if (existingIndex === -1) {
            bluetoothDevices.push({ id: peripheral.id, name, rssi: peripheral.rssi, connectable: peripheral.connectable })
            peripheralMap.set(peripheral.id, peripheral)
            sendToRenderer('bluetooth:deviceFound', bluetoothDevices[bluetoothDevices.length - 1])
        } else {
            bluetoothDevices[existingIndex].rssi = peripheral.rssi
            sendToRenderer('bluetooth:deviceUpdated', bluetoothDevices[existingIndex])
        }
    })

    noble.on('scanStart', () => {
        scanning = true
        sendToRenderer('bluetooth:scanState', { scanning: true })
    })

    noble.on('scanStop', () => {
        scanning = false
        sendToRenderer('bluetooth:scanState', { scanning: false })
        sendToRenderer('bluetooth:scanComplete', { devices: bluetoothDevices })
    })
}

// ========== IPC ==========

ipcMain.handle('bluetooth:scan', async () => {
    bluetoothDevices = []
    peripheralMap.clear()
    if (noble.state === 'poweredOn') {
        noble.startScanning([], true)
        setTimeout(() => { if (scanning) noble.stopScanning() }, 5000)
        return { success: true, message: '开始扫描' }
    }
    return { success: false, message: '蓝牙未开启' }
})

ipcMain.handle('bluetooth:getDevices', () => {
    return { success: true, devices: [...bluetoothDevices].sort((a, b) => b.rssi - a.rssi) }
})

ipcMain.handle('bluetooth:connect', async (event, deviceId) => {
    const peripheral = peripheralMap.get(deviceId)
    if (!peripheral) return { success: false, message: '设备不存在' }
    
    try {
        if (scanning) { noble.stopScanning(); await new Promise(r => setTimeout(r, 500)) }
        
        await new Promise((resolve, reject) => {
            peripheral.connect((error) => error ? reject(error) : resolve())
        })
        selectedDevice = peripheral
        
        await new Promise((resolve, reject) => {
            peripheral.discoverServices(['180d'], (error, services) => {
                if (error || services.length === 0) { reject(new Error('未找到心率服务')); return }
                services.forEach(service => {
                    service.discoverCharacteristics(['2a37'], (error, characteristics) => {
                        if (error || characteristics.length === 0) return
                        characteristics.forEach(char => {
                            char.subscribe(() => {})
                            char.on('data', (data) => {
                                const flags = data.readUInt8(0)
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

ipcMain.handle('bluetooth:disconnect', async () => {
    if (selectedDevice) {
        await new Promise((resolve, reject) => {
            selectedDevice.disconnect((error) => error ? reject(error) : resolve())
        })
        selectedDevice = null
    }
    return { success: true, message: '断开成功' }
})

ipcMain.handle('bluetooth:isScanning', () => ({ scanning }))

ipcMain.handle('bluetooth:toggleFloatingWindow', () => {
    const visible = toggleFloatingWindow()
    return { success: true, visible }
})

ipcMain.handle('bluetooth:getFloatingWindowSettings', () => {
    return { success: true, settings: floatingWindowSettings }
})

ipcMain.handle('bluetooth:updateFloatingWindowSettings', (event, settings) => {
    console.log('收到设置更新:', settings)
    floatingWindowSettings = { ...floatingWindowSettings, ...settings }
    console.log('新设置:', floatingWindowSettings)
    applyFloatingWindowSettings()
    
    if (floatingWindow && floatingWindowVisible && !floatingWindow.isDestroyed()) {
        floatingWindow.webContents.send('floating-window:update-style', floatingWindowSettings.style)
    }
    
    sendToRenderer('bluetooth:floatingWindowSettingsUpdated', floatingWindowSettings)
    return { success: true, settings: floatingWindowSettings }
})

ipcMain.on('floating-window:move', (event, position) => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        const [x, y] = floatingWindow.getPosition()
        floatingWindow.setPosition(x + position.deltaX, y + position.deltaY)
    }
})

app.on('will-quit', () => {
    if (selectedDevice) selectedDevice.disconnect()
    if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.close()
    noble.stopScanning()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
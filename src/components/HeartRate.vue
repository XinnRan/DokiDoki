<template>
  <div class="heart-rate-component">
    <div class="header">
      <h1>DokiDoki</h1>
      <div class="status-indicator" :class="statusClass"></div>
    </div>
    
    <div class="heart-rate-container">
      <div class="heart-icon" :class="{ beating: isConnected }">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
      
      <div class="heart-rate-value" :class="{ connected: isConnected }">
        {{ heartRate }}
        <span class="unit">BPM</span>
      </div>
      
      <div class="status" :class="statusClass">
        {{ status }}
      </div>
      <div v-if="isConnected && currentDevice" class="device-name">
        {{ currentDevice }}
      </div>
    </div>
    
    <div class="controls">
      <button 
        @click="toggleConnection"
        :disabled="isScanning"
        :class="{ connected: isConnected, scanning: isScanning }"
      >
        {{ isConnected ? '断开连接' : isScanning ? '扫描中...' : '连接设备' }}
      </button>
      
      <button 
        v-if="isConnected"
        @click="toggleFloatingWindow"
        :class="{ active: floatingWindowVisible }"
      >
        {{ floatingWindowVisible ? '关闭悬浮窗' : '显示悬浮窗' }}
      </button>
      
      <button 
        v-if="isConnected"
        @click="openSettings"
      >
        设置
      </button>
    </div>
    
    <!-- 🔴 使用 Teleport 将对话框渲染到 body -->
    <Teleport to="body">
      <!-- 设备选择对话框 -->
      <div v-if="showDeviceDialog" class="dialog-overlay" @click.self="closeDeviceDialog">
        <div class="dialog" @click.stop>
          <div class="dialog-header">
            <h2>选择心率设备</h2>
            <button class="close-button" @click="closeDeviceDialog">×</button>
          </div>
          
          <div v-if="isScanning" class="scanning2">
            <div class="spinner"></div>
            <p>正在扫描心率设备...</p>
            <div class="scan-progress">
              <div class="progress-bar"></div>
            </div>
          </div>
          
          <div v-else class="device-list">
            <div 
              v-for="device in devices" 
              :key="device.id"
              class="device-item"
              @click="connectToDevice(device)"
            >
              <div class="device-info">
                <div class="device-name">{{ device.name }}</div>
                <div class="device-signal">
                  <span class="signal-bars">
                    <span class="bar" :style="{ opacity: getSignalStrength(device.rssi) >= 1 ? 1 : 0.3 }"></span>
                    <span class="bar" :style="{ opacity: getSignalStrength(device.rssi) >= 2 ? 1 : 0.3 }"></span>
                    <span class="bar" :style="{ opacity: getSignalStrength(device.rssi) >= 3 ? 1 : 0.3 }"></span>
                    <span class="bar" :style="{ opacity: getSignalStrength(device.rssi) >= 4 ? 1 : 0.3 }"></span>
                  </span>
                  <span class="rssi">{{ device.rssi }} dBm</span>
                </div>
              </div>
              <div class="device-connect">
                <span class="connect-icon">→</span>
              </div>
            </div>
            
            <div v-if="devices.length === 0" class="no-devices">
              <div class="no-devices-icon">🔍</div>
              <p>未发现心率设备</p>
              <small>请确保您的心率设备已开启并处于可发现状态</small>
            </div>
          </div>
          
          <div class="dialog-footer">
            <button class="secondary-button" @click="closeDeviceDialog">取消</button>
          </div>
        </div>
      </div>
      
      <!-- 设置对话框 -->
      <div v-if="showSettings" class="dialog-overlay" @click.self="closeSettings">
        <div class="dialog" @click.stop>
          <div class="dialog-header">
            <h2>悬浮窗设置</h2>
            <button class="close-button" @click="closeSettings">×</button>
          </div>
          
          <div class="settings-content">
            <div class="settings-section">
              <h3>窗口属性</h3>
              
              <div class="setting-item">
                <label>
                  <input type="checkbox" v-model="settings.mouseThrough" @change="updateFloatingWindowSettings">
                  鼠标穿透
                </label>
              </div>
              
              <div class="setting-item">
                <label>透明度：{{ Math.round(settings.opacity * 100) }}%</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1" 
                  v-model.number="settings.opacity"
                  @change="updateFloatingWindowSettings"
                >
              </div>
              
              <div class="setting-item">
                <label>
                  <input type="checkbox" v-model="settings.alwaysOnTop" @change="updateFloatingWindowSettings">
                  始终置顶
                </label>
              </div>
            </div>
            
            <div class="settings-section">
              <h3>显示样式</h3>
              <div class="style-preview">
                <div 
                  v-for="style in availableStyles" 
                  :key="style.id"
                  class="style-item"
                  :class="{ active: settings.style === style.id }"
                  @click="selectStyle(style.id)"
                >
                  <div class="style-preview-box" :class="style.id">
                    <span class="preview-heart-rate">85</span>
                    <span class="preview-unit">BPM</span>
                  </div>
                  <div class="style-name">{{ style.name }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="dialog-footer">
            <button class="secondary-button" @click="closeSettings">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- 开发者信息 -->
    <div class="developer-info">
      <a href="https://gitee.com/xxinrann" target="_blank" rel="noopener noreferrer">
        Developed By XxinRan
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 状态变量
const heartRate = ref(0)
const isConnected = ref(false)
const isScanning = ref(false)
const showDeviceDialog = ref(false)
const devices = ref([])
const scanInterval = ref(null)
const floatingWindowVisible = ref(false)
const showSettings = ref(false)
const currentDevice = ref('')

// 设置变量
const settings = ref({
  mouseThrough: false,
  opacity: 0.9,
  alwaysOnTop: true,
  style: 'simple'
})

// 可用的显示样式
const availableStyles = [
  { id: 'simple', name: '简约风格' },
  { id: 'modern', name: '现代风格' },
  { id: 'digital', name: '数字风格' },
  { id: 'minimal', name: '极简风格' },
  { id: 'heartbeat', name: '心跳曲线' },
  { id: 'neon', name: '霓虹风格' },
  { id: 'glass', name: '玻璃拟态' },
  { id: 'gradient', name: '渐变风格' }
]

// 计算属性
const status = computed(() => {
  if (isScanning.value) return '扫描中...'
  if (isConnected.value) return '已连接'
  return '未连接'
})

const statusClass = computed(() => {
  if (isScanning.value) return 'scanning'
  if (isConnected.value) return 'connected'
  return 'disconnected'
})

// 信号强度计算
function getSignalStrength(rssi) {
  if (rssi > -50) return 4
  if (rssi > -60) return 3
  if (rssi > -70) return 2
  return 1
}

// 使用统一的 API 名称
const api = window.electronAPI || window.bluetoothAPI

// 检查 API 是否存在
if (!api) {
  console.error('API 不存在：window.electronAPI 和 window.bluetoothAPI 都未定义')
}

// 监听心率数据
function setupHeartRateListener() {
  api?.onHeartRateData((data) => {
    heartRate.value = data.bpm
  })
}

// 添加设置更新监听
function setupSettingsListener() {
  api?.onFloatingWindowSettingsUpdated((newSettings) => {
    console.log('收到设置更新:', newSettings)
    settings.value = newSettings
  })
}

// 加载悬浮窗设置
async function loadFloatingWindowSettings() {
  try {
    const result = await api?.getFloatingWindowSettings()
    if (result?.success) {
      settings.value = { ...settings.value, ...result.settings }
      console.log('加载设置成功:', settings.value)
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 切换连接状态
async function toggleConnection() {
  if (isConnected.value) {
    await disconnect()
  } else {
    await openDeviceDialog()
  }
}

// 打开设备选择对话框
async function openDeviceDialog() {
  showDeviceDialog.value = true
  await startScan()
}

// 关闭设备选择对话框
function closeDeviceDialog() {
  showDeviceDialog.value = false
  isScanning.value = false
  devices.value = []
  if (scanInterval.value) {
    clearInterval(scanInterval.value)
    scanInterval.value = null
  }
}

// 开始扫描设备
async function startScan() {
  isScanning.value = true
  devices.value = []
  
  try {
    const result = await api?.startScan()
    if (!result?.success) {
      console.error('扫描失败:', result?.message)
      isScanning.value = false
      return
    }
    
    scanInterval.value = setInterval(async () => {
      const scannedDevices = await api?.getDevices()
      devices.value = scannedDevices || []
      
      const stillScanning = await api?.isScanning()
      if (!stillScanning) {
        isScanning.value = false
        if (scanInterval.value) {
          clearInterval(scanInterval.value)
          scanInterval.value = null
        }
      }
    }, 500)
  } catch (error) {
    console.error('扫描失败:', error)
    isScanning.value = false
  }
}

// 连接到设备
async function connectToDevice(device) {
  try {
    const result = await api?.connectDevice(device.id)
    
    if (result?.success) {
      isConnected.value = true
      currentDevice.value = device.name
      closeDeviceDialog()
    } else {
      console.error('连接失败:', result?.message)
      alert(result?.message || '连接失败')
    }
  } catch (error) {
    console.error('连接失败:', error)
    alert('连接失败：' + error.message)
  }
}

// 断开连接
async function disconnect() {
  try {
    const result = await api?.disconnectDevice()
    
    if (result?.success) {
      isConnected.value = false
      heartRate.value = 0
      currentDevice.value = ''
      if (floatingWindowVisible.value) {
        await toggleFloatingWindow()
      }
    }
  } catch (error) {
    console.error('断开连接失败:', error)
  }
}

// 切换悬浮窗口
async function toggleFloatingWindow() {
  try {
    const result = await api?.toggleFloatingWindow()
    if (result?.success) {
      floatingWindowVisible.value = result.visible
    }
  } catch (error) {
    console.error('切换悬浮窗口失败:', error)
  }
}

// 打开设置页面
async function openSettings() {
  await loadFloatingWindowSettings()
  showSettings.value = true
}

// 关闭设置页面
function closeSettings() {
  showSettings.value = false
}

// 更新悬浮窗口设置
async function updateFloatingWindowSettings() {
  try {
    console.log('发送悬浮窗设置:', settings.value)
    const plainSettings = JSON.parse(JSON.stringify(settings.value))
    console.log('转换后的设置:', plainSettings)
    const result = await api?.updateFloatingWindowSettings(plainSettings)
    console.log('设置更新结果:', result)
  } catch (error) {
    console.error('更新悬浮窗口设置失败:', error)
  }
}

// 选择样式
async function selectStyle(styleId) {
  settings.value.style = styleId
  await updateFloatingWindowSettings()
}

// 生命周期钩子
onMounted(() => {
  setupHeartRateListener()
  setupSettingsListener()
  loadFloatingWindowSettings()
})

onUnmounted(() => {
  api?.removeAllListeners('heart-rate:data')
  api?.removeAllListeners('bluetooth:floatingWindowSettingsUpdated')
  
  if (isConnected.value) {
    disconnect()
  }
  if (scanInterval.value) {
    clearInterval(scanInterval.value)
  }
})
</script>

<!-- 🔴 全局样式（去掉 scoped，让对话框样式生效） -->
<style>
/* 全局字体设置 */
* {
  font-family: 'Microsoft YaHei', 'PingFang SC', 'SimSun', sans-serif !important;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
}

/* ========== 对话框全局样式（必须非 scoped）========== */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  position: relative;
  z-index: 10000;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8f9fa;
}

.dialog-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.dialog-header .close-button {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border: 2px solid #dee2e6 !important;
  font-size: 14px !important;
  color: #6c757d !important;
  cursor: pointer !important;
  padding: 0 !important;
  width: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  font-weight: 300 !important;
  line-height: 1 !important;
  min-width: unset !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  overflow: visible !important;
  position: static !important;
}

.dialog-header .close-button:hover {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
  border-color: #dc3545 !important;
  color: white !important;
  transform: rotate(90deg) scale(1.05) !important;
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.4) !important;
}

.scanning {
  padding: 10px 10px;
  text-align: center;
}
.scanning2 {
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.scan-progress {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  margin-top: 20px;
  overflow: hidden;
}

.progress-bar {
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, #3498db 0%, #2196F3 100%);
  border-radius: 2px;
  animation: progress 5s linear;
}

@keyframes progress {
  from { width: 0; }
  to { width: 100%; }
}

.device-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 0;
}

.device-item {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  background-color: #ffffff;
}

.device-item:hover {
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  padding-left: 16px;
  box-sizing: border-box;
  margin-left: -4px;
}

.device-info {
  flex: 1;
  text-align: left;
}

.device-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.device-signal {
  display: flex;
  align-items: center;
  gap: 10px;
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.bar {
  width: 4px;
  background-color: #4CAF50;
  border-radius: 2px;
}

.bar:nth-child(1) { height: 8px; }
.bar:nth-child(2) { height: 12px; }
.bar:nth-child(3) { height: 16px; }
.bar:nth-child(4) { height: 20px; }

.rssi {
  font-size: 12px;
  color: #999;
}

.device-connect {
  color: #3498db;
  font-size: 18px;
  transition: all 0.2s ease;
  font-weight: bold;
}

.device-item:hover .device-connect {
  transform: translateX(5px);
  color: #2196F3;
}

.no-devices {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.no-devices-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.no-devices p {
  font-size: 16px;
  margin-bottom: 10px;
}

.no-devices small {
  font-size: 12px;
  opacity: 0.8;
}

.dialog-footer {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  background: #f8f9fa;
}

.secondary-button {
  background: #f5f5f5;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: none;
}

.secondary-button:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 30px;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}

.setting-item input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #f0f0f0;
  outline: none;
  -webkit-appearance: none;
}

.setting-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
}

.setting-item input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.style-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.style-item {
  border: 2px solid #f0f0f0;
  border-radius: 10px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  background: #ffffff;
}

.style-item:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.style-item.active {
  border-color: #3498db;
  background-color: #f8f9fa;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
}

.style-preview-box {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.style-preview-box.simple {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.style-preview-box.modern {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 50%;
}

.style-preview-box.digital {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  font-family: 'Courier New', monospace;
}

.style-preview-box.minimal {
  background: transparent;
  border: 2px solid #333;
  color: #333;
}

.style-preview-box.heartbeat {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  position: relative;
  overflow: hidden;
}

.style-preview-box.heartbeat::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -100%;
  width: 200%;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  animation: heartbeat-line 1.2s infinite;
}

.style-preview-box.neon {
  background: #000;
  color: #00ff00;
  box-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
  font-family: 'Courier New', monospace;
}

.style-preview-box.glass {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #333;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.style-preview-box.gradient {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
  background-size: 400% 400%;
  animation: gradient-shift 3s ease infinite;
}

@keyframes heartbeat-line {
  0% {
    left: -100%;
    transform: translateY(-50%);
  }
  100% {
    left: 100%;
    transform: translateY(-50%);
  }
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.preview-heart-rate {
  font-size: 20px;
  margin-right: 2px;
}

.preview-unit {
  font-size: 12px;
  font-weight: normal;
}

.style-name {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.device-list::-webkit-scrollbar {
  width: 6px;
}

.device-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.device-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.device-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>

<!-- 🔴 组件内部样式（scoped） -->
<style scoped>
.heart-rate-component {
  max-width: 700px;
  margin: 50px auto;
  padding: 35px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  text-align: center;
  transition: all 0.3s ease;
  animation: fade-in-up 0.6s ease-out;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.heart-rate-component:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
}

.header h1 {
  font-size: 26px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.status-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #dee2e6;
}

.status-indicator::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
}

.status-indicator.connected {
  border-color: #4CAF50;
}

.status-indicator.connected::after {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.6);
}

.status-indicator.scanning {
  border-color: #2196F3;
  animation: pulse 1.5s infinite;
  transform-origin: center;
  will-change: transform;
  position: relative;
  z-index: 1;
}

.status-indicator.scanning::after {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  box-shadow: 0 0 12px rgba(33, 150, 243, 0.6);
  animation: pulse-inner 1.5s infinite;
  transform-origin: center;
  will-change: transform;
  position: relative;
  z-index: 1;
}

.status-indicator.disconnected {
  border-color: #9E9E9E;
}

.status-indicator.disconnected::after {
  background: linear-gradient(135deg, #9E9E9E 0%, #757575 100%);
}

@keyframes pulse-inner {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.heart-rate-container {
  margin: 35px 0;
}

.heart-icon {
  font-size: 56px;
  color: #e74c3c;
  margin-bottom: 25px;
  transition: all 0.3s ease;
}

.heart-icon.beating {
  animation: heartbeat 1.2s infinite;
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.1); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
  70% { transform: scale(1); }
}

.heart-icon svg {
  width: 56px;
  height: 56px;
}

.heart-rate-value {
  font-size: 64px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.heart-rate-value.connected {
  color: #e74c3c;
  animation: valueChange 0.5s ease;
  transform-origin: center;
  will-change: transform;
  position: relative;
  z-index: 1;
}

@keyframes valueChange {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.unit {
  font-size: 22px;
  font-weight: normal;
  color: #7f8c8d;
  margin-left: 10px;
}

.status {
  font-size: 18px;
  font-weight: 500;
  margin-top: 12px;
  transition: all 0.3s ease;
}

.status.connected {
  color: #4CAF50;
}

.status.scanning {
  color: #2196F3;
}

.status.disconnected {
  color: #9E9E9E;
}

.device-name {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 8px;
  transition: all 0.3s ease;
  font-weight: 400;
  opacity: 0.9;
}

.controls {
  margin: 35px 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

/* 按钮样式 - 统一美化版 */
button {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: 2px solid transparent;
  padding: 18px 36px;
  border-radius: 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
  min-width: 200px;
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

button:hover:not(:disabled)::before {
  left: 100%;
}

button:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.5);
  border-color: rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 1;
}

button.connected {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
}

button.connected:hover:not(:disabled) {
  box-shadow: 0 8px 25px rgba(231, 76, 60, 0.5);
}

button.scanning {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
}

button.active {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

button.active:hover:not(:disabled) {
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.5);
}

button:disabled {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
}

button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 次要按钮样式 */
.secondary-button {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  border: 2px solid #dee2e6;
  padding: 14px 28px;
  border-radius: 28px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.secondary-button:hover {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  border-color: #6c757d;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

.secondary-button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 开发者信息样式 */
.developer-info {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
  font-size: 14px;
  color: #999;
  transition: all 0.3s ease;
}

.developer-info a {
  color: #3498db;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 500;
}

.developer-info a:hover {
  color: #2980b9;
  text-decoration: underline;
  transform: translateY(-1px);
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .heart-rate-component {
    margin: 20px;
    padding: 20px;
  }
  
  .heart-rate-value {
    font-size: 48px;
  }
  
  .style-preview {
    grid-template-columns: 1fr;
  }
  
  .style-preview-box {
    width: 80px;
    height: 80px;
  }
  
  .developer-info {
    margin-top: 30px;
    padding-top: 15px;
    font-size: 12px;
  }
}
</style>
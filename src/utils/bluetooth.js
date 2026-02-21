//标准心率服务UUID
export const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb'


//心率特征UUID
export const HEART_RATE_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb'


//客户端特征UUID
export const HEART_RATE_CLIENT_CHARACTERISTIC_UUID = '00002a39-0000-1000-8000-00805f9b34fb'


//解析心率数据，根据BLE规范

export function parseHeartRateData(value){
    const flags = value.getUint8(0)
    const format8bit = (flags & 0x01) === 0
      // 解析心率值 (8位或16位)
  const bpm = format8bit 
    ? value.getUint8(1) 
    : value.getUint16(1, true)
  
  const result = {
    bpm: bpm,
    timestamp: Date.now(),
    energyExpended: null,
    rrInterval: null,
    contactStatus: false
  }
  return result
}

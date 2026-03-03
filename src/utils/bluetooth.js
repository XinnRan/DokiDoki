/**
 * 蓝牙心率服务相关常量和工具函数
 * 遵循蓝牙低功耗(BLE)心率服务规范
 */

/**
 * 标准心率服务UUID
 * 用于识别BLE设备上的心率服务
 */
export const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb'

/**
 * 心率特征UUID
 * 用于读取心率测量值
 */
export const HEART_RATE_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb'

/**
 * 客户端特征UUID
 * 用于配置心率测量通知
 */
export const HEART_RATE_CLIENT_CHARACTERISTIC_UUID = '00002a39-0000-1000-8000-00805f9b34fb'

/**
 * 解析心率数据，根据BLE规范
 * @param {DataView} value - 原始心率数据
 * @returns {Object} 解析后的心率数据对象
 */
export function parseHeartRateData(value){
    // 获取标志位，用于确定数据格式
    const flags = value.getUint8(0)
    // 检查是否为8位格式
    const format8bit = (flags & 0x01) === 0
    
    // 解析心率值 (8位或16位)
    const bpm = format8bit 
        ? value.getUint8(1) 
        : value.getUint16(1, true)
    
    // 构建结果对象
    const result = {
        bpm: bpm,  // 心率值
        timestamp: Date.now(),  // 时间戳
        energyExpended: null,  // 能量消耗（预留）
        rrInterval: null,  // RR间隔（预留）
        contactStatus: false  // 接触状态（预留）
    }
    
    return result
}

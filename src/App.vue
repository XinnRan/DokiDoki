<template>
  <div class="app">
    <!-- 心率监测组件 -->
    <HeartRate />
  </div>
</template>

<script setup>
/**
 * 主应用组件
 * 作为应用的入口点，引入并渲染心率监测组件
 */
import HeartRate from './components/HeartRate.vue' // 导入心率监测组件
</script>

<style scoped>
/**
 * 主应用样式
 */
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}
</style>
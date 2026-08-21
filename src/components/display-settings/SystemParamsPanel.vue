<script setup lang="ts">
import Button from 'primevue/button';
import Slider from 'primevue/slider';
import InputNumber from 'primevue/inputnumber';
import Divider from 'primevue/divider';

defineProps<{
  animScale: number;
  fontScale: number;
  lockTimeout: number;
}>();

const emit = defineEmits<{
  (e: 'update:animScale', value: number): void;
  (e: 'update:fontScale', value: number): void;
  (e: 'update:lockTimeout', value: number): void;
  (e: 'applyAnimScale', value: number): void;
  (e: 'applyFontScale'): void;
  (e: 'applyLockTimeout'): void;
  (e: 'resetSystemParams'): void;
}>();
</script>

<template>
  <div class="card">
    <h3 class="card-title">系统参数</h3>
    <div class="field">
      <label>动画速度</label>
      <div class="btn-group">
        <Button label="关闭" size="small" :outlined="animScale !== 0" @click="emit('applyAnimScale', 0)" />
        <Button label="0.5x" size="small" :outlined="animScale !== 0.5" @click="emit('applyAnimScale', 0.5)" />
        <Button label="1x" size="small" :outlined="animScale !== 1" @click="emit('applyAnimScale', 1)" />
      </div>
    </div>
    <div class="field">
      <label>自定义动画: {{ animScale }}x</label>
      <Slider :model-value="animScale" @update:model-value="emit('update:animScale', $event as number)" :min="0" :max="10" :step="0.5" @change="emit('applyAnimScale', animScale)" />
    </div>
    <Divider />
    <div class="field">
      <label>字体大小: {{ fontScale }}</label>
      <Slider :model-value="fontScale" @update:model-value="emit('update:fontScale', $event as number)" :min="0.85" :max="1.3" :step="0.05" />
      <Button label="应用" size="small" class="mt" @click="emit('applyFontScale')" />
    </div>
    <Divider />
    <div class="field">
      <label>锁屏时间（毫秒，0 表示立即）</label>
      <div class="input-row">
        <InputNumber :model-value="lockTimeout" @update:model-value="emit('update:lockTimeout', $event)" :min="0" class="flex-1" />
        <Button label="应用" size="small" @click="emit('applyLockTimeout')" />
      </div>
    </div>
    <Divider />
    <Button label="恢复默认" text severity="danger" @click="emit('resetSystemParams')" />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Slider from 'primevue/slider';

const props = defineProps<{
  overscan: [number, number, number, number];
}>();

const emit = defineEmits<{
  (e: 'update:overscan', value: [number, number, number, number]): void;
  (e: 'apply'): void;
  (e: 'reset'): void;
}>();

function updateIndex(i: number, val: number) {
  const next = [...props.overscan] as [number, number, number, number];
  next[i] = val;
  emit('update:overscan', next);
}
</script>

<template>
  <div class="card">
    <h3 class="card-title">过扫描</h3>
    <p class="hint">Android 10+ 部分机型不支持，失败将自动重置</p>
    <div class="overscan-preview">
      <div
        class="overscan-screen"
        :style="{
          borderTopWidth: Math.max(0, overscan[1]) / 4 + 'px',
          borderRightWidth: Math.max(0, overscan[2]) / 4 + 'px',
          borderBottomWidth: Math.max(0, overscan[3]) / 4 + 'px',
          borderLeftWidth: Math.max(0, overscan[0]) / 4 + 'px',
        }"
      ></div>
    </div>
    <div v-for="(label, i) in ['左', '上', '右', '下']" :key="i" class="field">
      <label>{{ label }}: {{ overscan[i] }}px</label>
      <Slider :model-value="overscan[i]" @update:model-value="updateIndex(i, $event as number)" :min="-200" :max="200" :step="10" />
    </div>
    <div class="input-row">
      <Button label="应用" size="small" @click="emit('apply')" />
      <Button label="重置" size="small" text severity="danger" @click="emit('reset')" />
    </div>
  </div>
</template>

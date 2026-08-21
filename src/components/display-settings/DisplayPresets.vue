<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Divider from 'primevue/divider';

defineProps<{
  display: { size?: string; density?: number; default_size?: string; default_density?: number } | null;
}>();

const emit = defineEmits<{
  (e: 'applySize', size: string): void;
  (e: 'applyDensity', density: number): void;
  (e: 'toast', message: string, severity: string): void;
}>();

const customSize = ref('');
const customDensity = ref<number | null>(null);

const SIZE_PRESETS = [
  { label: '原生', value: '' },
  { label: '1080P', value: '1080x2400' },
  { label: '720P', value: '720x1600' },
  { label: '2K', value: '1440x3200' },
];
const DENSITY_PRESETS = [
  { label: '原生', value: 0 },
  { label: '480', value: 480 },
  { label: '420', value: 420 },
  { label: '360', value: 360 },
  { label: '320', value: 320 },
];

function validSize(s: string): boolean {
  return /^\d+x\d+$/.test(s);
}

function applyCustomSize() {
  if (!validSize(customSize.value)) {
    emit('toast', '分辨率格式非法，应为 宽x高（如 1080x2400）', 'warn');
    return;
  }
  emit('applySize', customSize.value);
}

function applyCustomDensity() {
  if (!customDensity.value || customDensity.value <= 0) {
    emit('toast', '密度应为正整数', 'warn');
    return;
  }
  emit('applyDensity', customDensity.value);
}
</script>

<template>
  <div class="card">
    <h3 class="card-title">分辨率 / DPI</h3>
    <div class="field">
      <label>分辨率预设</label>
      <div class="btn-group">
        <Button
          v-for="p in SIZE_PRESETS"
          :key="p.label"
          :label="p.label"
          size="small"
          :outlined="display?.size !== p.value"
          @click="emit('applySize', p.value)"
        />
      </div>
    </div>
    <div class="field">
      <label>自定义分辨率</label>
      <div class="input-row">
        <InputText v-model="customSize" placeholder="如 1080x2400" class="flex-1" />
        <Button label="应用" size="small" @click="applyCustomSize" />
      </div>
    </div>
    <Divider />
    <div class="field">
      <label>密度预设</label>
      <div class="btn-group">
        <Button
          v-for="p in DENSITY_PRESETS"
          :key="p.label"
          :label="p.label"
          size="small"
          :outlined="display?.density !== p.value"
          @click="emit('applyDensity', p.value)"
        />
      </div>
    </div>
    <div class="field">
      <label>自定义密度</label>
      <div class="input-row">
        <InputNumber v-model="customDensity" placeholder="如 420" class="flex-1" />
        <Button label="应用" size="small" @click="applyCustomDensity" />
      </div>
    </div>
  </div>
</template>

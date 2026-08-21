<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

defineProps<{
  visible: boolean;
  message: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    header="确认操作"
    :style="{ width: '400px' }"
  >
    <p>{{ message }}</p>
    <template #footer>
      <Button label="取消" text @click="emit('update:visible', false)" />
      <Button label="确认" severity="danger" @click="emit('confirm')" />
    </template>
  </Dialog>
</template>

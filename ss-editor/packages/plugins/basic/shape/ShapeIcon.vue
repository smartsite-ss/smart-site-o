<template>
  <div class="icon">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        stroke="currentColor"
        stroke-width="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M12 6 L18 18 M6 18 L12 6"
        stroke="currentColor"
        stroke-width="2"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
// ShapeIcon 组件
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #333;
}
</style>

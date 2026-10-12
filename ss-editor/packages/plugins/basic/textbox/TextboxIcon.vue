<template>
  <div class="textbox-icon">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        stroke-width="2"
      />
      <line
        x1="5"
        y1="7"
        x2="19"
        y2="7"
        stroke="currentColor"
        stroke-width="2"
      />
      <line
        x1="5"
        y1="11"
        x2="19"
        y2="11"
        stroke="currentColor"
        stroke-width="2"
      />
      <line
        x1="5"
        y1="15"
        x2="15"
        y2="15"
        stroke="currentColor"
        stroke-width="2"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
// Textbox icon component
</script>

<style scoped>
.textbox-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

svg {
  width: 24px;
  height: 24px;
  color: #409eff;
}
</style>

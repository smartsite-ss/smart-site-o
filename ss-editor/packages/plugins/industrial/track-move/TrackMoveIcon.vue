<template>
  <svg
    viewBox="0 0 24 24"
    width="32"
    height="32"
  >
    <!-- Track line -->
    <polyline
      points="3,18 10,18 10,12 18,12 21,12"
      fill="none"
      stroke="#4A90A4"
      stroke-width="2"
      stroke-dasharray="3,2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Start point -->
    <circle
      cx="3"
      cy="18"
      r="2"
      fill="#3498DB"
      stroke="#FFFFFF"
      stroke-width="0.8"
    />
    <!-- End point -->
    <circle
      cx="21"
      cy="12"
      r="2"
      fill="#3498DB"
      stroke="#FFFFFF"
      stroke-width="0.8"
    />
    <!-- Animated moving dot -->
    <circle
      cx="12"
      cy="12"
      r="2.5"
      fill="#FF5722"
      stroke="#FFFFFF"
      stroke-width="0.8"
    />
    <!-- Inner highlight -->
    <circle
      cx="12"
      cy="12"
      r="1"
      fill="rgba(255,255,255,0.4)"
    />
  </svg>
</template>
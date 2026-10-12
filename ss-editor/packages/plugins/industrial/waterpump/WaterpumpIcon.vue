<template>
  <svg
    :width="size || 24"
    :height="size || 24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 左侧管道 -->
    <rect
      x="0"
      y="10.5"
      width="6"
      height="3"
      rx="0.5"
      :fill="pipeColor"
      opacity="0.9"
    />

    <!-- 左侧法兰 -->
    <rect
      x="5.5"
      y="10"
      width="1.2"
      height="4"
      rx="0.3"
      :fill="flangeColor"
    />
    <!-- 左法兰螺栓 -->
    <circle
      cx="6.1"
      cy="11"
      r="0.35"
      fill="#7F8C8D"
      stroke="#5D6D7E"
      stroke-width="0.2"
    />
    <circle
      cx="6.1"
      cy="13"
      r="0.35"
      fill="#7F8C8D"
      stroke="#5D6D7E"
      stroke-width="0.2"
    />

    <!-- 泵体（圆形） -->
    <circle
      cx="12"
      cy="12"
      r="5.5"
      :fill="bodyColor"
    />
    <!-- 泵体高光 -->
    <ellipse
      cx="10.5"
      cy="10"
      rx="3"
      ry="2"
      fill="white"
      fill-opacity="0.25"
    />
    <!-- 内圈凹槽 -->
    <circle
      cx="12"
      cy="12"
      r="4"
      :fill="darkBodyColor"
      opacity="0.6"
    />

    <!-- 右侧法兰 -->
    <rect
      x="17.3"
      y="10"
      width="1.2"
      height="4"
      rx="0.3"
      :fill="flangeColor"
    />
    <!-- 右法兰螺栓 -->
    <circle
      cx="17.9"
      cy="11"
      r="0.35"
      fill="#7F8C8D"
      stroke="#5D6D7E"
      stroke-width="0.2"
    />
    <circle
      cx="17.9"
      cy="13"
      r="0.35"
      fill="#7F8C8D"
      stroke="#5D6D7E"
      stroke-width="0.2"
    />

    <!-- 右侧管道 -->
    <rect
      x="18.5"
      y="10.5"
      width="5.5"
      height="3"
      rx="0.5"
      :fill="pipeColor"
      opacity="0.9"
    />

    <!-- 风叶（6叶片 + 中心轴） -->
    <g :transform="`rotate(${rotation}, 12, 12)`">
      <!-- 6片风叶 -->
      <g :fill="impellerColor">
        <rect
          x="11.75"
          y="8.2"
          width="0.5"
          height="3.8"
          rx="0.15"
        />
        <rect
          x="11.75"
          y="12"
          width="0.5"
          height="3.8"
          rx="0.15"
        />
        <rect
          x="8.2"
          y="11.75"
          width="3.8"
          height="0.5"
          rx="0.15"
        />
        <rect
          x="12"
          y="11.75"
          width="3.8"
          height="0.5"
          rx="0.15"
        />
        <!-- 斜向风叶 -->
        <rect
          x="9.4"
          y="9.4"
          width="0.45"
          height="2.8"
          rx="0.15"
          transform="rotate(45 12 12)"
        />
        <rect
          x="14.2"
          y="9.4"
          width="0.45"
          height="2.8"
          rx="0.15"
          transform="rotate(-45 12 12)"
        />
        <rect
          x="9.4"
          y="12.8"
          width="0.45"
          height="2.8"
          rx="0.15"
          transform="rotate(-45 12 12)"
        />
        <rect
          x="14.2"
          y="12.8"
          width="0.45"
          height="2.8"
          rx="0.15"
          transform="rotate(45 12 12)"
        />
      </g>
      <!-- 中心轮毂 -->
      <circle
        cx="12"
        cy="12"
        r="1.2"
        :fill="darkImpellerColor"
      />
      <circle
        cx="12"
        cy="12"
        r="0.4"
        fill="#1a252f"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number;
  bodyColor?: string;
  impellerColor?: string;
  pipeColor?: string;
  flangeColor?: string;
  rotation?: number;
  darkBodyColor?: string;
  darkImpellerColor?: string;
}>();
</script>

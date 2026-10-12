<script setup lang="ts">
const _props = defineProps<{
  w: number
  h: number
  borderWidth: number
  color: string
  bgColor: string
  borderColor: string
}>()
</script>

<template>
  <svg
    :viewBox="`0 0 200 200`"
    style="width:100%;height:100%;display:block;"
  >
    <filter id="innerShadow">
      <feGaussianBlur
        in="SourceGraphic"
        stdDeviation="3"
        result="blur"
      />
      <feOffset
        in="blur"
        dx="2.5"
        dy="2.5"
      />
    </filter>
    <g>
      <circle
        style="fill:rgba(0,0,0,0.1)"
        cx="100"
        cy="100"
        r="87"
        filter="url(#innerShadow)"
      />
      <circle
        :style="`fill:${bgColor};stroke:${borderColor};stroke-width:${borderWidth}px`"
        cx="100"
        cy="100"
        r="80"
      />
    </g>
    <g>
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="55"
        :style="`stroke:${color};stroke-width:3px`"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="43200s"
          repeatCount="indefinite"
          :from="`${(360*new Date().getHours())/12+new Date().getMinutes()/2} 100 100`"
          :to="`${(360*new Date().getHours())/12+new Date().getMinutes()/2+360} 100 100`"
        />
      </line>
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="40"
        :style="`stroke:${color};stroke-width:4px`"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="3600s"
          repeatCount="indefinite"
          :from="`${(360*new Date().getMinutes())/60} 100 100`"
          :to="`${(360*new Date().getMinutes())/60+360} 100 100`"
        />
      </line>
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="30"
        :style="`stroke:${color};stroke-width:2px`"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="60s"
          repeatCount="indefinite"
          :from="`${(360*new Date().getSeconds())/60} 100 100`"
          :to="`${(360*new Date().getSeconds())/60+360} 100 100`"
        />
      </line>
    </g>
    <circle
      style="fill:#128a86;stroke:#c1efed;stroke-width:2px"
      cx="100"
      cy="100"
      r="3"
    />
    <line
      v-for="n in 12"
      :key="n"
      x1="100"
      y1="30"
      x2="100"
      y2="40"
      :style="`stroke:${color}`"
      :transform="`rotate(${(n*360)/12} 100 100)`"
    />
  </svg>
</template>
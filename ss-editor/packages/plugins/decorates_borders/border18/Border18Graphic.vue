<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <linearGradient
          :id="'mr-teal-h'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            :stop-color="colors[2]"
          />
          <stop
            offset="25%"
            :stop-color="colors[0]"
          />
          <stop
            offset="50%"
            :stop-color="colors[2]"
          />
          <stop
            offset="75%"
            :stop-color="colors[0]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <linearGradient
          :id="'mr-teal-v'"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            :stop-color="colors[2]"
          />
          <stop
            offset="25%"
            :stop-color="colors[0]"
          />
          <stop
            offset="50%"
            :stop-color="colors[2]"
          />
          <stop
            offset="75%"
            :stop-color="colors[0]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <linearGradient
          :id="'mr-warm'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            :stop-color="colors[1]"
          />
          <stop
            offset="50%"
            :stop-color="colors[2]"
          />
          <stop
            offset="100%"
            :stop-color="colors[1]"
          />
        </linearGradient>
        <linearGradient
          :id="'mr-gold-h'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            :stop-color="colors[2]"
          />
          <stop
            offset="40%"
            :stop-color="colors[1]"
          />
          <stop
            offset="60%"
            :stop-color="colors[1]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <filter id="mr-glow">
          <feGaussianBlur
            stdDeviation="1"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        :fill="backgroundColor"
        x="0"
        y="0"
        :width="w"
        :height="h"
      />

      <!-- 外边框 -->
      <rect
        x="4"
        y="4"
        :width="w - 8"
        :height="h - 8"
        fill="none"
        :stroke="colors[0]"
        stroke-width="2.5"
        filter="url(#mr-glow)"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.5;1;0.5"
          :dur="`${3 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </rect>
      <!-- 内边框 -->
      <rect
        x="10"
        y="10"
        :width="w - 20"
        :height="h - 20"
        fill="none"
        :stroke="colors[1]"
        stroke-width="1.5"
        stroke-opacity="0.7"
      />
      <!-- 金线边框 -->
      <rect
        x="7"
        y="7"
        :width="w - 14"
        :height="h - 14"
        fill="none"
        :stroke="colors[2]"
        stroke-width="0.8"
        stroke-opacity="0.5"
      />

      <!-- 顶部边框线 -->
      <line
        x1="52"
        y1="4"
        :x2="w - 52"
        y2="4"
        :stroke="`url(#mr-teal-h)`"
        stroke-width="1"
      />
      <!-- 底部边框线 -->
      <line
        x1="52"
        :y1="h - 4"
        :x2="w - 52"
        :y2="h - 4"
        :stroke="`url(#mr-teal-h)`"
        stroke-width="1"
      />
      <!-- 左侧边框线 -->
      <line
        x1="4"
        y1="52"
        x2="4"
        :y2="h - 52"
        :stroke="`url(#mr-teal-v)`"
        stroke-width="1"
      />
      <!-- 右侧边框线 -->
      <line
        :x1="w - 4"
        y1="52"
        :x2="w - 4"
        :y2="h - 52"
        :stroke="`url(#mr-teal-v)`"
        stroke-width="1"
      />

      <!-- ========== 钻石格栅沿边 ========== -->
      <g opacity="0.7">
        <g
          v-for="i in topDiamondCount"
          :key="'td'+i"
          :transform="`translate(${52 + (i - 1) * diamondStep}, 0)`"
        >
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[0]"
            stroke-width="0.8"
          />
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[2]"
            stroke-width="0.4"
          />
        </g>
        <g
          v-for="i in topDiamondCount"
          :key="'bd'+i"
          :transform="`translate(${52 + (i - 1) * diamondStep}, ${h})`"
        >
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[0]"
            stroke-width="0.8"
          />
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[2]"
            stroke-width="0.4"
          />
        </g>
        <g
          v-for="i in sideDiamondCount"
          :key="'ld'+i"
          :transform="`translate(0, ${52 + (i - 1) * diamondStep})`"
        >
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[0]"
            stroke-width="0.8"
          />
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[2]"
            stroke-width="0.4"
          />
        </g>
        <g
          v-for="i in sideDiamondCount"
          :key="'rd'+i"
          :transform="`translate(${w}, ${52 + (i - 1) * diamondStep})`"
        >
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[0]"
            stroke-width="0.8"
          />
          <polygon
            :points="diamondPoints"
            fill="none"
            :stroke="colors[2]"
            stroke-width="0.4"
          />
        </g>
      </g>

      <!-- ========== 拱形边饰 ========== -->
      <g
        v-if="showArches"
        filter="url(#mr-glow)"
      >
        <!-- 顶部拱形 -->
        <g
          v-for="i in archCount"
          :key="'ta'+i"
        >
          <path
            :d="`M ${52 + (i-1) * archStep},12 Q ${52 + (i-0.5) * archStep},-8 ${52 + i * archStep},12`"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.3;0.8;0.3"
              :dur="`${3 / animationSpeed}s`"
              :begin="`${i * 0.2}s`"
              repeatCount="indefinite"
            />
          </path>
          <path
            :d="`M ${52 + (i-1) * archStep},8 Q ${52 + (i-0.5) * archStep},0 ${52 + i * archStep},8`"
            fill="none"
            :stroke="colors[1]"
            stroke-width="0.7"
            stroke-opacity="0.5"
          />
          <!-- 拱内小圆点 -->
          <circle
            :cx="52 + (i-0.5) * archStep"
            cy="5"
            r="2"
            :fill="colors[2]"
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              :dur="`${2 / animationSpeed}s`"
              :begin="`${i * 0.15}s`"
              repeatCount="indefinite"
            />
          </circle>
        </g>
        <!-- 底部拱形 -->
        <g
          v-for="i in archCount"
          :key="'ba'+i"
        >
          <path
            :d="`M ${52 + (i-1) * archStep},${h-12} Q ${52 + (i-0.5) * archStep},${h+8} ${52 + i * archStep},${h-12}`"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.8;0.3;0.8"
              :dur="`${3 / animationSpeed}s`"
              :begin="`${i * 0.2}s`"
              repeatCount="indefinite"
            />
          </path>
          <path
            :d="`M ${52 + (i-1) * archStep},${h-8} Q ${52 + (i-0.5) * archStep},${h} ${52 + i * archStep},${h-8}`"
            fill="none"
            :stroke="colors[1]"
            stroke-width="0.7"
            stroke-opacity="0.5"
          />
          <circle
            :cx="52 + (i-0.5) * archStep"
            :cy="h-5"
            r="2"
            :fill="colors[2]"
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.8;0.3;0.8"
              :dur="`${2 / animationSpeed}s`"
              :begin="`${i * 0.15}s`"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </g>

      <!-- 左右两侧小拱 -->
      <g
        v-if="showArches"
        filter="url(#mr-glow)"
      >
        <g
          v-for="i in sideArchCount"
          :key="'la'+i"
        >
          <path
            :d="`M 12,${52 + (i-1) * archStep} Q -8,${52 + (i-0.5) * archStep} 12,${52 + i * archStep}`"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
            stroke-opacity="0.5"
          />
          <circle
            cx="5"
            :cy="52 + (i-0.5) * archStep"
            r="2"
            :fill="colors[2]"
            opacity="0.4"
          />
        </g>
        <g
          v-for="i in sideArchCount"
          :key="'ra'+i"
        >
          <path
            :d="`M ${w-12},${52 + (i-1) * archStep} Q ${w+8},${52 + (i-0.5) * archStep} ${w-12},${52 + i * archStep}`"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
            stroke-opacity="0.5"
          />
          <circle
            :cx="w-5"
            :cy="52 + (i-0.5) * archStep"
            r="2"
            :fill="colors[2]"
            opacity="0.4"
          />
        </g>
      </g>

      <!-- 角饰星纹 左上 -->
      <g
        v-if="showStars"
        transform="translate(36, 36)"
      >
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            :dur="`${30 / animationSpeed}s`"
            repeatCount="indefinite"
          />
          <!-- 外层正方形 -->
          <polygon
            points="0,-25 25,0 0,25 -25,0"
            fill="none"
            :stroke="colors[0]"
            stroke-width="2"
          />
          <!-- 内层旋转正方形 -->
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          />
          <!-- 中心填充 -->
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            :fill="colors[3]"
            fill-opacity="0.15"
          />
          <!-- 中心点 -->
          <circle
            cx="0"
            cy="0"
            r="3.5"
            :fill="colors[2]"
            filter="url(#mr-glow)"
          >
            <animate
              attributeName="r"
              values="2.5;4;2.5"
              :dur="`${1.5 / animationSpeed}s`"
              repeatCount="indefinite"
            />
          </circle>
          <!-- 星纹小点缀 -->
          <circle
            cx="0"
            cy="-25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="0"
            cy="25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="-25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
        </g>
      </g>

      <!-- 角饰星纹 右上 -->
      <g
        v-if="showStars"
        :transform="`translate(${w - 36}, 36)`"
      >
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            :dur="`${30 / animationSpeed}s`"
            begin="5s"
            repeatCount="indefinite"
          />
          <polygon
            points="0,-25 25,0 0,25 -25,0"
            fill="none"
            :stroke="colors[0]"
            stroke-width="2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            :fill="colors[3]"
            fill-opacity="0.15"
          />
          <circle
            cx="0"
            cy="0"
            r="3.5"
            :fill="colors[2]"
            filter="url(#mr-glow)"
          >
            <animate
              attributeName="r"
              values="4;2.5;4"
              :dur="`${1.5 / animationSpeed}s`"
              begin="0.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="0"
            cy="-25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="0"
            cy="25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="-25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
        </g>
      </g>

      <!-- 角饰星纹 左下 -->
      <g
        v-if="showStars"
        :transform="`translate(36, ${h - 36})`"
      >
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            :dur="`${30 / animationSpeed}s`"
            begin="10s"
            repeatCount="indefinite"
          />
          <polygon
            points="0,-25 25,0 0,25 -25,0"
            fill="none"
            :stroke="colors[0]"
            stroke-width="2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            :fill="colors[3]"
            fill-opacity="0.15"
          />
          <circle
            cx="0"
            cy="0"
            r="3.5"
            :fill="colors[2]"
            filter="url(#mr-glow)"
          >
            <animate
              attributeName="r"
              values="2.5;4;2.5"
              :dur="`${1.5 / animationSpeed}s`"
              begin="1s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="0"
            cy="-25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="0"
            cy="25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="-25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
        </g>
      </g>

      <!-- 角饰星纹 右下 -->
      <g
        v-if="showStars"
        :transform="`translate(${w - 36}, ${h - 36})`"
      >
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            :dur="`${30 / animationSpeed}s`"
            begin="15s"
            repeatCount="indefinite"
          />
          <polygon
            points="0,-25 25,0 0,25 -25,0"
            fill="none"
            :stroke="colors[0]"
            stroke-width="2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            fill="none"
            :stroke="colors[2]"
            stroke-width="1.2"
          />
          <polygon
            points="0,-17 12,-12 17,0 12,12 0,17 -12,12 -17,0 -12,-12"
            :fill="colors[3]"
            fill-opacity="0.15"
          />
          <circle
            cx="0"
            cy="0"
            r="3.5"
            :fill="colors[2]"
            filter="url(#mr-glow)"
          >
            <animate
              attributeName="r"
              values="4;2.5;4"
              :dur="`${1.5 / animationSpeed}s`"
              begin="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="0"
            cy="-25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="0"
            cy="25"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
          <circle
            cx="-25"
            cy="0"
            r="1.5"
            :fill="colors[2]"
            opacity="0.8"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border18Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showStars: { type: Boolean, default: true },
    showArches: { type: Boolean, default: true },
    animationSpeed: { type: Number, default: 1 },
  },
  computed: {
    diamondStep(): number {
      return 24;
    },
    diamondPoints(): string {
      return '0,-6 5,0 0,6 -5,0';
    },
    topDiamondCount(): number {
      return Math.max(0, Math.floor((this.w - 104) / this.diamondStep));
    },
    sideDiamondCount(): number {
      return Math.max(0, Math.floor((this.h - 104) / this.diamondStep));
    },
    archStep(): number {
      return Math.max(30, (this.w - 104) / Math.max(1, Math.floor((this.w - 104) / 30)));
    },
    archCount(): number {
      return Math.max(1, Math.floor((this.w - 104) / this.archStep));
    },
    sideArchCount(): number {
      return Math.max(1, Math.floor((this.h - 104) / this.archStep));
    },
  },
});
</script>

<style scoped>
.ss-border-box {
  width: 100%;
  height: 100%;
}
.ss-border-box svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
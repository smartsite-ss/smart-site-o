<template>
  <div
    class="border05-container"
    :style="`box-shadow: inset 0 0 25px 3px ${colors[0]}`"
  >
    <svg
      class="border05-bg"
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <polygon
        :fill="backgroundColor"
        :points="`
          4, 0 ${w - 4}, 0 ${w}, 4 ${w}, ${h - 4} ${w - 4}, ${h}
          4, ${h} 0, ${h - 4} 0, 4
        `"
      />
    </svg>

    <svg
      v-for="item in border"
      :key="item"
      class="border-item"
      :class="item"
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <polygon
        :fill="colors[1]"
        points="40, 0 5, 0 0, 5 0, 16 3, 19 3, 7 7, 3 35, 3"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border05Graphic',
  props: {
    w: {
      type: Number,
      default: 400,
    },
    h: {
      type: Number,
      default: 300,
    },
    colors: {
      type: Array as () => string[],
      required: true,
    },
    backgroundColor: {
      type: String,
      default: 'transparent',
    },
  },
  setup() {
    const border = ['left-top', 'right-top', 'left-bottom', 'right-bottom'];
    return { border };
  },
});
</script>

<style scoped>
.border05-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.border05-bg {
  width: 100%;
  height: 100%;
  display: block;
}

.border-item {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.right-top {
  right: 0;
  left: auto;
  transform: rotateY(180deg);
}

.left-bottom {
  bottom: 0;
  top: auto;
  transform: rotateX(180deg);
}

.right-bottom {
  right: 0;
  bottom: 0;
  left: auto;
  top: auto;
  transform: rotateX(180deg) rotateY(180deg);
}
</style>
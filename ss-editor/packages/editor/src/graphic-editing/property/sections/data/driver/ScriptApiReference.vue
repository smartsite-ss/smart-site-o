<template>
  <div class="script-api-reference">
    <div class="api-section">
      <div class="api-section-title">
        🖼️ 图元操作
      </div>
      <div
        v-for="api in graphicApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        🔔 告警操作
      </div>
      <div
        v-for="api in alarmApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        🔗 图元联动
      </div>
      <div
        v-for="api in linkageApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        🌐 后台接口
      </div>
      <div
        v-for="api in httpApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        🏷️ 标签操作
      </div>
      <div
        v-for="api in tagApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        🧮 数值工具
      </div>
      <div
        v-for="api in mathApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>

    <div class="api-section">
      <div class="api-section-title">
        ⏱️ 定时器
      </div>
      <div
        v-for="api in timerApis"
        :key="api.name"
        class="api-item"
      >
        <div class="api-name">
          {{ api.name }}
        </div>
        <div class="api-desc">
          {{ api.desc }}
        </div>
        <div
          v-if="api.example"
          class="api-example"
        >
          {{ api.example }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ApiItem {
  name: string;
  desc: string;
  example?: string;
}

const graphicApis: ApiItem[] = [
  { name: 'setText(val)', desc: '设置图元文本内容', example: 'api.setText(data.text);' },
  { name: 'setBackground(c)', desc: '设置图元背景色', example: 'api.setBackground(data.color);' },
  { name: 'setVisible(b)', desc: '设置图元显示/隐藏', example: 'api.setVisible(data.number > 0);' },
  { name: 'setBorder(c, w)', desc: '设置图元边框颜色和宽度', example: 'api.setBorder("#d03050", 2);' },
  { name: 'setFontSize(n)', desc: '设置文字大小', example: 'api.setFontSize(16);' },
  { name: 'setFontColor(c)', desc: '设置文字颜色', example: 'api.setFontColor("#ffffff");' },
  { name: 'setRotation(d)', desc: '设置旋转角度', example: 'api.setRotation(data.number * 3.6);' },
  { name: 'setOpacity(v)', desc: '设置不透明度 (0-1)', example: 'api.setOpacity(0.8);' },
  { name: 'setPosition(x, y)', desc: '设置图元位置', example: 'api.setPosition(100, 200);' },
  { name: 'setSize(w, h)', desc: '设置图元大小', example: 'api.setSize(120, 40);' },
];

const alarmApis: ApiItem[] = [
  { name: 'triggerAlarm(l, m)', desc: '触发告警 (level: critical/warning/info)', example: 'api.triggerAlarm("critical", "温度过高!");' },
  { name: 'clearAlarm(id)', desc: '清除指定告警', example: 'api.clearAlarm(alarmId);' },
  { name: 'getActiveAlarms()', desc: '获取当前活跃告警列表', example: 'const alarms = api.getActiveAlarms();' },
];

const linkageApis: ApiItem[] = [
  { name: 'showGraphic(id)', desc: '显示指定图元', example: 'api.showGraphic("alarm_light_01");' },
  { name: 'hideGraphic(id)', desc: '隐藏指定图元', example: 'api.hideGraphic("normal_indicator");' },
  { name: 'setGraphicProps(id, p)', desc: '设置其它图元属性', example: 'api.setGraphicProps("g1", { blink: true });' },
  { name: 'getGraphicProperty(id, p)', desc: '读取其它图元属性', example: 'const v = api.getGraphicProperty("g1", "text");' },
];

const httpApis: ApiItem[] = [
  { name: 'httpGet(url, h)', desc: '发送 GET 请求', example: 'api.httpGet("/api/status").then(...);' },
  { name: 'httpPost(url, d, h)', desc: '发送 POST 请求', example: 'api.httpPost("/api/log", { val: data.number });' },
];

const tagApis: ApiItem[] = [
  { name: 'readTag(id)', desc: '读取标签当前值', example: 'const tag = api.readTag("tag_001");' },
  { name: 'writeTag(id, v)', desc: '写入标签值', example: 'api.writeTag("tag_002", data.number);' },
];

const mathApis: ApiItem[] = [
  { name: 'Math.*', desc: '标准 Math 库 (round/sin/cos/abs...)', example: 'api.Math.round(data.number, 2);' },
  { name: 'round(v, d?)', desc: '四舍五入', example: 'api.round(data.number, 1);' },
  { name: 'clamp(v, min, max)', desc: '限制值在范围内', example: 'api.clamp(data.number, 0, 100);' },
  { name: 'mapRange(v, i1, i2, o1, o2)', desc: '线性映射到目标范围', example: 'api.mapRange(data.number, 0, 100, 0, 360);' },
  { name: 'colorForValue(v, min, max)', desc: '值映射为颜色（绿→黄→红）', example: 'api.colorForValue(data.number, 0, 100);' },
  { name: 'formatNumber(v, d?)', desc: '数字格式化', example: 'api.formatNumber(data.number, 2);' },
];

const timerApis: ApiItem[] = [
  { name: 'setTimeout(cb, d)', desc: '延迟执行回调', example: 'api.setTimeout(() => { ... }, 1000);' },
  { name: 'setInterval(cb, i)', desc: '周期执行回调', example: 'api.setInterval(() => { ... }, 5000);' },
  { name: 'clearTimeout(id)', desc: '清除定时器', example: 'api.clearTimeout(timerId);' },
  { name: 'clearInterval(id)', desc: '清除周期定时器', example: 'api.clearInterval(intervalId);' },
];
</script>

<style scoped>
@import '../../../../../panels/styles/data-panel-theme.scss';

.script-api-reference {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px;
  height: 100%;
  overflow-y: auto;
}

.api-section {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface);
}

.api-section-title {
  font-size: 11.5px;
  font-weight: 700;
  padding: 7px 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--primary) 3%, transparent));
  color: var(--text);
  letter-spacing: 0.3px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}

.api-item {
  padding: 7px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  transition: background-color 0.1s ease;

  &:hover { background-color: color-mix(in srgb, var(--primary) 4%, transparent); }

  &:last-child { border-bottom: none; }
}

.api-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--primary);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  line-height: 1.4;
}

.api-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.4;
}

.api-example {
  font-size: 10.5px;
  color: var(--text-tertiary);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  background: color-mix(in srgb, var(--background) 80%, transparent);
  padding: 3px 6px;
  border-radius: 3px;
  margin-top: 4px;
  word-break: break-all;
  line-height: 1.45;
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
</style>
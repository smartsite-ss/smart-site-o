// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type SimulationActionType = 'setTagValue' | 'triggerAlarm' | 'acknowledgeAlarm' | 'wait' | 'executeScript' | 'switchScenario';

export interface SimulationStep {
  id: string;
  action: SimulationActionType;
  delay: number;
  duration?: number;
  params?: Record<string, unknown>;
}

export type ScenarioStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  steps: SimulationStep[];
  loop: boolean;
  speed: number;
  status: ScenarioStatus;
}
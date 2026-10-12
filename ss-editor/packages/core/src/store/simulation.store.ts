// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import type { SimulationScenario, ScenarioStatus } from '../scada-data/types/simulation.types';

function getDefaultState() {
  return {
    activeScenario: null as SimulationScenario | null,
    isRunning: false,
    currentStep: 0,
    elapsedTime: 0,
    status: 'idle' as ScenarioStatus,
    speed: 1,
    loop: false,
  };
}

export const useSimulationStore = defineStore('simulation', {
  state: () => getDefaultState(),

  getters: {
    hasActiveScenario: (state): boolean => state.activeScenario !== null,
    totalSteps: (state): number => state.activeScenario?.steps?.length ?? 0,
    progress: (state): number => {
      if (!state.activeScenario || state.activeScenario.steps.length === 0) return 0;
      return (state.currentStep + 1) / state.activeScenario.steps.length;
    },
    currentStepData: (state) => {
      return state.activeScenario?.steps?.[state.currentStep] ?? null;
    },
  },

  actions: {
    loadScenario(scenario: SimulationScenario): void {
      this.activeScenario = scenario;
      this.currentStep = 0;
      this.elapsedTime = 0;
      this.isRunning = false;
      this.status = 'idle';
    },

    start(): void {
      if (!this.activeScenario) return;
      this.isRunning = true;
      this.status = 'running';
    },

    pause(): void {
      this.isRunning = false;
      this.status = 'paused';
    },

    stop(): void {
      this.isRunning = false;
      this.currentStep = 0;
      this.elapsedTime = 0;
      this.status = 'idle';
    },

    nextStep(): void {
      if (!this.activeScenario) return;
      const totalSteps = this.activeScenario.steps.length;
      if (totalSteps === 0) return;
      const nextIndex = this.currentStep + 1;
      if (nextIndex >= totalSteps) {
        if (this.loop) {
          this.currentStep = 0;
        } else {
          this.stop();
        }
      } else {
        this.currentStep = nextIndex;
      }
    },

    previousStep(): void {
      if (this.currentStep > 0) {
        this.currentStep--;
      }
    },

    goToStep(step: number): void {
      if (!this.activeScenario) return;
      this.currentStep = Math.max(0, Math.min(step, this.activeScenario.steps.length - 1));
    },

    setSpeed(speed: number): void {
      this.speed = Math.max(0.1, speed);
    },

    setLoop(loop: boolean): void {
      this.loop = loop;
    },

    setElapsedTime(time: number): void {
      this.elapsedTime = time;
    },

    clearScenario(): void {
      this.activeScenario = null;
      this.isRunning = false;
      this.currentStep = 0;
      this.elapsedTime = 0;
      this.status = 'idle';
    },
  },
});
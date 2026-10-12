// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { SimulationScenario, SimulationStep } from '../types/simulation.types';

interface EventBusLike {
  emit(eventType: string, payload: unknown, sourceId?: string): void;
}

export class SimulationEngine {
  private _scenarios: Map<string, SimulationScenario> = new Map();
  private _activeScenarioId: string | null = null;
  private _isRunning = false;
  private _isPaused = false;
  private _currentStepIndex = 0;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _startTime = 0;
  private _pausedAt = 0;
  private _totalPausedDuration = 0;
  private _eventBus: EventBusLike;

  constructor(eventBus: EventBusLike) { this._eventBus = eventBus; }

  registerScenario(scenario: SimulationScenario): void {
    scenario.status = 'idle';
    this._scenarios.set(scenario.id, scenario);
  }

  removeScenario(id: string): void {
    if (this._activeScenarioId === id) this.stop();
    this._scenarios.delete(id);
  }

  getScenarios(): SimulationScenario[] { return Array.from(this._scenarios.values()); }
  getActiveScenario(): SimulationScenario | null {
    if (!this._activeScenarioId) return null;
    return this._scenarios.get(this._activeScenarioId) || null;
  }

  getStatus(): { isRunning: boolean; isPaused: boolean; currentStep: number; elapsedTime: number; activeScenarioId: string | null } {
    return {
      isRunning: this._isRunning, isPaused: this._isPaused, currentStep: this._currentStepIndex,
      elapsedTime: this._isRunning ? Date.now() - this._startTime - this._totalPausedDuration : 0,
      activeScenarioId: this._activeScenarioId,
    };
  }

  async start(scenarioId: string): Promise<void> {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    this.stop();
    this._activeScenarioId = scenarioId;
    this._currentStepIndex = 0;
    this._isRunning = true;
    this._isPaused = false;
    this._startTime = Date.now();
    this._totalPausedDuration = 0;
    scenario.status = 'running';
    this._eventBus.emit('simulationStarted', { scenarioId, name: scenario.name });
    this._runNextStep(scenario);
  }

  pause(): void {
    if (!this._isRunning || this._isPaused) return;
    this._isPaused = true;
    this._pausedAt = Date.now();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._eventBus.emit('simulationPaused', { scenarioId: this._activeScenarioId });
    const scenario = this._scenarios.get(this._activeScenarioId!);
    if (scenario) scenario.status = 'paused';
  }

  resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._totalPausedDuration += Date.now() - this._pausedAt;
    const scenario = this._scenarios.get(this._activeScenarioId!);
    if (scenario) {
      scenario.status = 'running';
      this._runNextStep(scenario);
    }
  }

  stop(): void {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._isRunning = false;
    this._isPaused = false;
    this._currentStepIndex = 0;
    if (this._activeScenarioId) {
      const scenario = this._scenarios.get(this._activeScenarioId);
      if (scenario) scenario.status = 'completed';
      this._eventBus.emit('simulationStopped', { scenarioId: this._activeScenarioId });
      this._activeScenarioId = null;
    }
  }

  setSpeed(speed: number): void {
    const scenario = this.getActiveScenario();
    if (scenario) scenario.speed = speed;
  }

  destroy(): void { this.stop(); this._scenarios.clear(); }

  private _runNextStep(scenario: SimulationScenario): void {
    if (!this._isRunning || this._isPaused) return;
    const steps = scenario.steps;
    if (this._currentStepIndex >= steps.length) {
      if (scenario.loop) {
        this._currentStepIndex = 0;
        this._startTime = Date.now();
        this._totalPausedDuration = 0;
      } else { this.stop(); return; }
    }
    const step = steps[this._currentStepIndex];
    const delay = step.delay / (scenario.speed || 1);
    this._timer = setTimeout(() => {
      this._executeStep(step, scenario);
      this._currentStepIndex++;
      this._eventBus.emit('simulationStepChanged', { scenarioId: scenario.id, stepIndex: this._currentStepIndex, stepId: step.id });
      this._runNextStep(scenario);
    }, delay);
  }

  private _executeStep(step: SimulationStep, scenario: SimulationScenario): void {
    const params = step.params || {};
    switch (step.action) {
      case 'setTagValue':
        if (params.tagId && params.value !== undefined) {
          this._eventBus.emit('tagValueChanged', { tagId: params.tagId, value: params.value, quality: params.quality || 'good', sourceId: `simulation:${scenario.id}` });
        }
        break;
      case 'triggerAlarm':
        this._eventBus.emit('alarmTriggered', { definitionId: params.alarmId, tagId: params.tagId, value: params.value, level: params.level || 'warning', message: params.message || '' });
        break;
      case 'acknowledgeAlarm':
        this._eventBus.emit('alarmAcknowledged', { alarmId: params.alarmId });
        break;
      case 'executeScript':
        if (params.script) {
          try { new Function(params.script as string)(); } catch (err) { console.error('[SimulationEngine] Script error:', err); }
        }
        break;
    }
  }
}
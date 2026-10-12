// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { BasePlugin, PluginPropertySchema } from '@scada-editor/plugin-sdk';
import { PropertyVerifier } from './PropertyVerifier';
import { RenderFieldMapper } from './RenderFieldMapper';
import { createMockDrawContext } from './MockDrawContext';
import * as fs from 'fs';

export interface E2EResult {
  pluginName: string;
  steps: {
    schemaValid: boolean;
    defaultsConsistent: boolean;
    writeReadAllPassed: boolean;
    renderNoError: boolean;
    allFieldsUsed: boolean;
  };
  unusedFields: string[];
  failedFields: string[];
  errors: string[];
}

export class EndToEndValidator<T extends BasePlugin<any>> {

  constructor(
    private PluginClass: new (...args: any[]) => T,
    private schema: PluginPropertySchema,
    private pluginSourcePath: string,
  ) {}

  async validate(): Promise<E2EResult> {
    const errors: string[] = [];

    const schemaErrors = this.validateSchema();
    errors.push(...schemaErrors);

    const verifier = new PropertyVerifier(this.PluginClass, this.schema);
    const defaultResults = verifier.verifyDefaultValues();

    const allResults = verifier.verifyAll();

    const renderOk = this.verifyRenderNoError();

    let unusedFields: string[] = [];
    if (fs.existsSync(this.pluginSourcePath)) {
      const mapper = new RenderFieldMapper(this.schema, this.pluginSourcePath);
      unusedFields = mapper.getUnusedFields();
    }

    const failedFields = [
      ...defaultResults.filter(r => !r.passed).map(r => r.property),
      ...allResults.details.filter(r => !r.passed).map(r => r.property),
    ];

    return {
      pluginName: this.schema.name as string,
      steps: {
        schemaValid: schemaErrors.length === 0,
        defaultsConsistent: defaultResults.every(r => r.passed),
        writeReadAllPassed: allResults.failed === 0,
        renderNoError: renderOk,
        allFieldsUsed: unusedFields.length === 0,
      },
      unusedFields,
      failedFields: [...new Set(failedFields)],
      errors,
    };
  }

  private validateSchema(): string[] {
    const errs: string[] = [];
    if (!this.schema.name) errs.push('schema.name 缺失');
    if (!this.schema.fields || this.schema.fields.length === 0) errs.push('schema.fields 为空');
    for (const f of this.schema.fields) {
      if (!f.name) errs.push('存在无名 field');
      if (!f.type) errs.push(`${f.name}: type 缺失`);
      if (f.type === 'select' && (!f.options || f.options.length === 0)) {
        errs.push(`${f.name}: select 的 options 为空`);
      }
    }
    return errs;
  }

  private verifyRenderNoError(): boolean {
    try {
      const instance = this.createInstance();
      const w = this.getSchemaWidth() || 100;
      const h = this.getSchemaHeight() || 100;
      const { dc } = createMockDrawContext(w, h);
      (instance as any).render(dc);
      return true;
    } catch {
      return false;
    }
  }

  private createInstance(): T {
    return new this.PluginClass();
  }

  private getSchemaWidth(): number {
    const wField = this.schema.fields.find(f => f.name === 'width');
    return (wField?.defaultValue as number) || 0;
  }

  private getSchemaHeight(): number {
    const hField = this.schema.fields.find(f => f.name === 'height');
    return (hField?.defaultValue as number) || 0;
  }
}
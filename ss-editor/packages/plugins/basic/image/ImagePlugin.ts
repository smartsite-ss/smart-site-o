// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getThemeColor } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { imagePropertySchema } from './imagePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultImageProps = buildDefaultsFromSchema(imagePropertySchema);


@Graphic({
  type: 'image',
  name: i18n.global.t('image.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('image.description'),
  defaultProps: defaultImageProps,
  defaultWidth: 100,
  defaultHeight: 100,
  features: { resizable: true, rotatable: true, cloneable: true, groupable: true, dataBindable: false },
})
export class ImagePlugin extends BasePlugin<InferSchemaProps<typeof imagePropertySchema>> {
  private image: HTMLImageElement | null = null;

  constructor(x = 0, y = 0, w = 100, h = 100) {
    super('image', x, y, w, h);
    this.setDefaultProps({ ...defaultImageProps });
    this._loadImage();
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({} as any);
  }

  onPropertyChanged(changes: any): void {
    if (changes.customProps && 'src' in changes.customProps) {
      this._loadImage();
    }
  }

  private _loadImage(): void {
    const src = this.pluginProps.src;
    if (!src) {
      this.image = null;
      return;
    }
    if (this.image && this.image.src === src) {
      return;
    }
    this.image = new Image();
    this.image.onload = () => {
      this.setProps('src', src);
    };
    this.image.onerror = () => {
      this.image = null;
    };
    this.image.src = src;
  }

  protected render(dc: DrawContext): void {
    const src = this.pluginProps.src;
    if (src && (!this.image || this.image.src !== src)) {
      this._loadImage();
    }
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (props.shadowColor !== '#00000000') {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowBlur = Number(props.shadowBlur);
      ctx.shadowOffsetX = Number(props.shadowOffsetX);
      ctx.shadowOffsetY = Number(props.shadowOffsetY);
    }

    if (Number(props.borderWidth) > 0 && props.borderColor !== '#00000000') {
      ctx.strokeStyle = props.borderColor;
      ctx.lineWidth = Number(props.borderWidth);
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Number(props.opacity);
    ctx.filter = props.imageFilter;

    if (this.image && this.image.complete) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((Number(props.imageRotation) * Math.PI) / 180);
      ctx.scale(Number(props.imageScale), Number(props.imageScale));
      ctx.translate(-width / 2, -height / 2);

      this._drawImageWithFit(ctx, width, height, props);
      ctx.restore();
    } else {
      ctx.fillStyle = getThemeColor('surface');
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, Number(props.borderRadius));
      ctx.fill();

      ctx.fillStyle = getThemeColor('textSecondary');
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(props.alt, width / 2, height / 2);
    }

    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }

  private _drawImageWithFit(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof imagePropertySchema>): void {
    const img = this.image!;
    switch (props.imageFit) {
      case 'contain':
        this._drawContain(ctx, img, w, h);
        break;
      case 'cover':
        this._drawCover(ctx, img, w, h);
        break;
      case 'fill':
        ctx.drawImage(img, 0, 0, w, h);
        break;
      case 'none':
        ctx.drawImage(img, 0, 0);
        break;
      case 'scale-down':
        if (img.width <= w && img.height <= h) {
          ctx.drawImage(img, 0, 0);
        } else {
          this._drawContain(ctx, img, w, h);
        }
        break;
    }
  }

  private _drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
    const aspectRatio = img.width / img.height;
    const containerRatio = w / h;
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
    if (aspectRatio > containerRatio) {
      drawWidth = w;
      drawHeight = w / aspectRatio;
      drawX = 0;
      drawY = (h - drawHeight) / 2;
    } else {
      drawHeight = h;
      drawWidth = h * aspectRatio;
      drawX = (w - drawWidth) / 2;
      drawY = 0;
    }
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }

  private _drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
    const aspectRatio = img.width / img.height;
    const containerRatio = w / h;
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
    if (aspectRatio > containerRatio) {
      drawHeight = h;
      drawWidth = h * aspectRatio;
      drawX = (w - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = w;
      drawHeight = w / aspectRatio;
      drawX = 0;
      drawY = (h - drawHeight) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
}
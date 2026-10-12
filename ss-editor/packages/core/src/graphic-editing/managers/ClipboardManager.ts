// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com


import { ITransferableData } from '../../services/InterpageTransferService';

export interface IClipboardData {
  /** 序列化的图元数据 */
  data: ITransferableData[];
  /** 剪贴板操作模式 */
  mode: 'cut' | 'copy';
  /** 源页面ID */
  sourcePageId: string;
  /** 组合元数据（源数据来自组合时为非空） */
  groupMetadata?: {
    /** 是否为组合拷贝 */
    isGroupCopy: boolean;
    /** 源组合ID */
    sourceGroupId: string;
    /** 源组合名称 */
    groupName: string;
  };
}

export class ClipboardManager {
    private clipboardData: ITransferableData[] = [];
    private sourcePageId: string | null = null;
    private clipboardMode: 'copy' | 'cut' = 'copy';
    private pasteCount: number = 0;
    private groupMetadata: {
        isGroupCopy: boolean;
        sourceGroupId: string;
        groupName: string;
    } | null = null;

    /**
     * 设置剪贴板数据
     */
    setData(
        data: ITransferableData[], 
        mode: 'copy' | 'cut', 
        sourcePageId: string
    ): void {
        this.clipboardData = [...data];
        this.clipboardMode = mode;
        this.sourcePageId = sourcePageId;
        this.pasteCount = 0;
        this.groupMetadata = null;
    }
 
    /**
     * 增加粘贴计数
     */
    incrementPasteCount(): void {
        this.pasteCount++;
    }

    /**
     * 获取粘贴计数
     */
    getPasteCount(): number {
        return this.pasteCount;
    }

    /**
     * 获取剪贴板数据
     */
    getData(): ITransferableData[] {
        return [...this.clipboardData];
    }

    /**
     * 清空剪贴板数据
     */
    clearData(): void {
        this.clipboardData = [];
        this.clipboardMode = 'copy';
        this.sourcePageId = null;
        this.pasteCount = 0;
        this.groupMetadata = null;
    }

    /**
     * 检查剪贴板是否为空
     */
    isEmpty(): boolean {
        return this.clipboardData.length === 0;
    }

    /**
     * 获取源页面 ID
     */
    getSourcePageId(): string | null {
        return this.sourcePageId;
    }

    /**
     * 获取剪贴板模式
     */
    getClipboardMode(): 'copy' | 'cut' {
        return this.clipboardMode;
    }

    /**
     * 获取剪贴板内容数量
     */
    get itemCount(): number {
        return this.clipboardData.length;
    }

    /**
     * 设置组合元数据（copy 时源数据来自组合调用）
     */
    setGroupMetadata(metadata: { isGroupCopy: boolean; sourceGroupId: string; groupName: string }): void {
        this.groupMetadata = { ...metadata };
    }

    /**
     * 获取组合元数据
     */
    getGroupMetadata(): { isGroupCopy: boolean; sourceGroupId: string; groupName: string } | null {
        return this.groupMetadata;
    }
}

// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  SystemMenuConfigService,
  SystemMenuItem,
  SystemMenuButton,
} from './system-menu-config.service';
import { MenuI18nService, MenuI18nItem, MenuI18nTable } from './menu-i18n.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('系统菜单')
@Controller('system/menu/')
export class SystemMenuController {
  constructor(
    private readonly menuService: SystemMenuConfigService,
    private readonly menuI18nService: MenuI18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取系统菜单树（无需认证）' })
  @ApiQuery({ name: 'subsystem', required: false, description: '子系统标识，用于过滤菜单' })
  async getMenu(@Query('subsystem') subsystem?: string): Promise<SystemMenuItem[]> {
    return this.menuService.getMenu(subsystem);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量更新系统菜单树（管理员）' })
  async updateMenu(@Body() body: { menus: SystemMenuItem[] }): Promise<{ ok: boolean }> {
    await this.menuService.updateMenu(body.menus);
    return { ok: true };
  }

  @Post('item')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建单个菜单项（管理员）' })
  async createMenuItem(
    @Body() body: { item: SystemMenuItem; parentId?: string },
  ): Promise<{ ok: boolean }> {
    await this.menuService.createMenuItem(body.item, body.parentId || null);
    return { ok: true };
  }

  @Put('item/:menuId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新单个菜单项（管理员）' })
  async updateMenuItem(
    @Param('menuId') menuId: string,
    @Body() body: { item: SystemMenuItem; parentId?: string },
  ): Promise<{ ok: boolean }> {
    await this.menuService.updateMenuItem(menuId, body.item, body.parentId || undefined);
    return { ok: true };
  }

  @Delete(':menuId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除菜单项及其子项（管理员）' })
  async deleteMenuItem(@Param('menuId') menuId: string): Promise<{ ok: boolean }> {
    await this.menuService.deleteMenuItem(menuId);
    return { ok: true };
  }

  // ──────── 按钮权限 ────────

  @Get('buttons')
  @ApiOperation({ summary: '获取所有菜单按钮（无需认证）' })
  async getButtons(): Promise<SystemMenuButton[]> {
    return this.menuService.getMenuButtons();
  }

  @Get(':menuId/buttons')
  @ApiOperation({ summary: '获取指定菜单的按钮列表' })
  async getButtonsByMenu(@Param('menuId') menuId: string): Promise<SystemMenuButton[]> {
    return this.menuService.getMenuButtonsByMenu(menuId);
  }

  @Put('buttons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量更新菜单按钮（管理员）' })
  async updateButtons(@Body() body: { buttons: SystemMenuButton[] }): Promise<{ ok: boolean }> {
    await this.menuService.updateMenuButtons(body.buttons);
    return { ok: true };
  }

  @Post('buttons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建单个菜单按钮（管理员）' })
  async createButton(@Body() body: SystemMenuButton): Promise<{ ok: boolean }> {
    await this.menuService.createMenuButton(body);
    return { ok: true };
  }

  @Delete('buttons/:menuId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除菜单按钮（管理员）' })
  async deleteButton(@Param('menuId') menuId: string): Promise<{ ok: boolean }> {
    await this.menuService.deleteMenuButton(menuId);
    return { ok: true };
  }

  // ──────── 菜单国际化（data/menu/ 目录下的菜单显示名称） ────────

  @Get('i18n')
  @ApiOperation({ summary: '获取菜单国际化数据（无需认证）' })
  @ApiQuery({ name: 'locale', required: false, description: '语言，默认 zh-CN' })
  @ApiQuery({ name: 'menuId', required: false, description: '菜单ID，不传返回所有' })
  async getMenuI18n(
    @Query('locale') locale?: string,
    @Query('menuId') menuId?: string,
  ): Promise<MenuI18nTable | MenuI18nTable[]> {
    if (menuId) {
      return this.menuI18nService.getMenuI18n(menuId, locale) || null;
    }
    return this.menuI18nService.getAllMenuI18n(locale);
  }

  @Put('i18n')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新菜单国际化数据（管理员）' })
  async updateMenuI18n(
    @Body() body: { locale: string; menuId: string; table: Partial<MenuI18nTable> },
  ): Promise<{ ok: boolean }> {
    this.menuI18nService.updateMenuI18n(body.locale, body.menuId, body.table);
    return { ok: true };
  }

  @Put('i18n/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量更新菜单条目（管理员）' })
  async updateMenuItems(
    @Body() body: { locale: string; menuId: string; items: MenuI18nItem[] },
  ): Promise<{ ok: boolean }> {
    this.menuI18nService.updateMenuItems(body.locale, body.menuId, body.items);
    return { ok: true };
  }

  @Post('i18n/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步菜单国际化数据到 locale JSON 文件（管理员）' })
  async syncMenuI18n(
    @Body() body: { locale: string },
  ): Promise<{ synced: number; errors: string[] }> {
    return this.menuI18nService.syncToLocaleFiles(body.locale);
  }

  @Get('i18n/locales')
  @ApiOperation({ summary: '获取支持的语言列表' })
  async getMenuI18nLocales(): Promise<string[]> {
    return this.menuI18nService.getSupportedLocales();
  }

  // ──────── 权限码注册表（v8.0） ────────

  @Get('permissions/registry')
  @ApiOperation({ summary: '获取权限码注册表（无需认证）' })
  async getPermissionsRegistry(): Promise<{
    categories: { module: string; label: string; codes: { code: string; label: string }[] }[];
  }> {
    return this.menuService.getPermissionsRegistry();
  }
}

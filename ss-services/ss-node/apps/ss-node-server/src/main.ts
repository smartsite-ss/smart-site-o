// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule, getProductMode } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import {
  TransformInterceptor,
  getLogConfig,
  createAppFileTransport,
  createErrorFileTransport,
} from '@ss-node/ss-core';

// ============================================================
//  启动计时工具
//  记录每个启动阶段的耗时，输出到控制台便于诊断
// ============================================================

const STARTUP_TAG = 'Startup';

/** 辅助函数：格式化毫秒为可读字符串 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

/** 阶段计时器：记录开始时间，返回结束函数（调用后打印耗时日志） */
function startPhase(name: string): () => void {
  const t0 = performance.now();
  // 使用 console.log 而非 Logger，因为 Logger 在 NestFactory.create 之后才可用
  console.log(`[${STARTUP_TAG}] ⏳ ${name} ...`);
  return () => {
    const elapsed = performance.now() - t0;
    console.log(`[${STARTUP_TAG}] ✅ ${name} done (${formatMs(elapsed)})`);
  };
}

/**
 * S-C01: JWT_SECRET 启动时强制校验
 *
 * 校验规则：
 *   1. 必须设置（不能为空）
 *   2. 长度至少 32 字符（防止暴力破解）
 *   3. 生产环境不能是代码库默认密钥（开发环境允许但警告）
 *
 * 若校验失败，拒绝启动并打印明确错误信息。
 */
function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  // CODE-09: 代码库中已知的默认/占位密钥（含 .env.base 与 .env 中的占位值）
  // 补充 smart_scada_secret_key_change_this_in_production（原 .env 占位值，长度 47 通过长度校验但仍是占位）
  const KNOWN_DEFAULT_SECRETS = [
    'your-secret-key',
    'your-super-secret-jwt-key-change-this-in-production',
    'changeme',
    'secret',
    'jwt-secret',
    'my-secret',
    'super-secret',
    'smart_scada_secret_key_change_this_in_production',
    'smart_scada_secret_key',
    'ss-node-secret-key-change-this-in-production',
  ];
  // CODE-09: 占位特征子串 — 含这些词的密钥视为占位值（生产禁用）
  // 仅当长度也 < 64 时才判定（避免误伤含 "secret" 的合法长随机串）
  const PLACEHOLDER_PATTERNS = [
    'change-this',
    'change_this',
    'changeme',
    'your-',
    'replace-',
    'placeholder',
    'default-secret',
    'todo-replace',
  ];

  if (!secret) {
    console.error('[FATAL] JWT_SECRET 未设置。请在 .env 文件中配置一个至少 32 字符的随机密钥。');
    process.exit(1);
  }

  if (secret.length < 32) {
    console.error(
      `FATAL: JWT_SECRET 长度不足（当前 ${secret.length} 字符，要求至少 32 字符）。` +
        '请使用 `openssl rand -base64 48` 生成安全密钥。',
    );
    process.exit(1);
  }

  const isDefaultSecret = KNOWN_DEFAULT_SECRETS.includes(secret);
  // CODE-09: 启发式检测占位特征（仅对未达 64 字符的密钥判定，降低误伤）
  const hasPlaceholderPattern =
    secret.length < 64 && PLACEHOLDER_PATTERNS.some((p) => secret.toLowerCase().includes(p));
  const isWeakSecret = isDefaultSecret || hasPlaceholderPattern;

  if (isProduction && isWeakSecret) {
    console.error(
      'FATAL: 生产环境禁止使用代码库默认或占位 JWT_SECRET。' +
        '请在 .env 中配置随机生成的安全密钥（openssl rand -base64 48）。' +
        '检测到：' +
        (isDefaultSecret ? '已知默认值；' : '含占位特征词；'),
    );
    process.exit(1);
  }

  if (isWeakSecret) {
    console.warn(
      '[Startup] ⚠️ JWT_SECRET 使用代码库默认值或占位特征，仅适用于开发环境。' +
        '生产部署请更换为随机生成的安全密钥。',
    );
  } else {
    console.log('[Startup] ✅ JWT_SECRET 校验通过');
  }
}

async function bootstrap() {
  const totalStart = performance.now();

  // ──────── Phase -1: 安全启动校验 ────────
  // S-C01: JWT_SECRET 强度校验，拒绝弱密钥启动
  validateJwtSecret();
  // ──────── Phase 0: 环境准备 ────────
  const endPhase0 = startPhase('Phase 0: 环境准备（日志目录/项目根解析）');

  // 解析项目根目录：与 app.module.ts initProjectRoot() 逻辑保持一致
  // - dev 模式：__dirname 上溯 3 级 = ss-services/ss-node（本文件位于 apps/ss-node-server/src/ 或 dist/）
  // - 生产模式：process.cwd() = ss-run/ss/services/ss-node
  const projectRoot =
    process.env.NODE_ENV === 'production'
      ? process.cwd()
      : path.resolve(__dirname, '..', '..', '..');

  // 提前设置 SS_NODE_ROOT，供 PathResolverService 等 packages 下服务使用。
  // 必须在 NestFactory.create 之前设置，确保 LogViewerService 读取的日志路径
  // 与 main.ts 写入路径一致（否则 process.cwd() 不同会导致写入/读取路径不匹配）。
  if (!process.env.SS_NODE_ROOT) {
    process.env.SS_NODE_ROOT = projectRoot;
  }

  // 解析统一日志配置：LOG_DIR / LOG_MAX_SIZE / LOG_MAX_FILES / LOG_LEVEL
  // getLogConfig 内部基于 SS_NODE_ROOT 解析 LOG_DIR 相对路径，与 PathResolverService 一致
  const logConfig = getLogConfig();
  if (!fs.existsSync(logConfig.logDir)) {
    fs.mkdirSync(logConfig.logDir, { recursive: true });
  }
  endPhase0();

  // ──────── Phase 1: NestFactory.create（模块加载 + DI 容器初始化 + onModuleInit） ────────
  const endPhase1 = startPhase('Phase 1: NestFactory.create（模块加载/DI/onModuleInit）');

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        // P1优化：生产环境关闭 Console transport，仅保留文件 transport
        // 消除 Winston Console（内部 process.stdout.write 同步阻塞）导致的日志暂停卡顿
        ...(process.env.NODE_ENV !== 'production'
          ? [
              new winston.transports.Console({
                // 受 LOG_LEVEL 环境变量控制（默认 'info'）
                // 调试时设 LOG_LEVEL=warn 只看 warn+error，设 LOG_LEVEL=error 只看 error
                level: process.env.LOG_LEVEL || 'info',
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.ms(),
                  winston.format((info) => {
                    if (info.context === 'RouterExplorer' || info.context === 'RoutesResolver') {
                      return false;
                    }
                    return info;
                  })(),
                  winston.format.colorize(),
                  winston.format.printf(({ timestamp, level, message, context, ms }) => {
                    return `${timestamp} [${level}] [${context || 'Nest'}] ${message} ${ms}`;
                  }),
                ),
              }),
            ]
          : []),
        // 错误日志 transport：error/error-%DATE%.log（按天+按大小轮转，gzip 压缩）
        createErrorFileTransport(logConfig),
        // 应用日志 transport：app/app-%DATE%.log（按天+按大小轮转，gzip 压缩）
        createAppFileTransport(logConfig),
      ],
    }),
  });
  endPhase1();

  // ──────── Phase 2: 中间件与管道配置 ────────
  const endPhase2 = startPhase('Phase 2: 中间件/管道/拦截器/安全配置');

  // ── 全局异常过滤器 ──
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── 响应格式标准化拦截器 ──
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── 全局验证管道 ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── gzip 压缩（仅压缩 > 1KB 的响应） ──
  app.use(
    compression({
      threshold: 1024,
      level: 6,
    }),
  );

  // ── S-H01: Helmet 安全头（CSP / X-Content-Type-Options / X-Frame-Options 等） ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Vue 开发模式需要 inline script；生产构建后可收紧
          // 微信扫码登录需要加载 open.weixin.qq.com 的 QR JS SDK
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://open.weixin.qq.com',
            'https://res.wx.qq.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // 微信头像 CDN（thirdwx.qlogo.cn）需放行图片加载
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.qlogo.cn', 'https://wx.qlogo.cn'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          // 微信扫码二维码以 iframe 形式嵌入（open.weixin.qq.com/connect/qrconnect）
          frameSrc: ["'self'", 'https://open.weixin.qq.com'],
          // 微信 SDK 可能从其 CDN 加载 worker/frame 子资源
          childSrc: ["'self'", 'https://open.weixin.qq.com'],
        },
      },
      // 允许 CORS 场景下加载资源
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── cookie-parser（S-C03 Token HttpOnly Cookie 依赖） ──
  app.use(cookieParser());

  // ── 隐藏 X-Powered-By（Helmet 已覆盖，此处保留兜底） ──
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // ── Cache-Control 缓存策略 ──
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/docs')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (req.path === '/api/v1/system/health') {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-cache');
    }
    next();
  });

  // ── CORS ──
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // X-Request-Id 为前端请求拦截器注入的日志关联头，缺失会导致桌面端（Tauri，跨源）
    // CORS 预检失败，所有请求被浏览器拦截且无报错（登录页表现为点登录无反应）
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  });

  // ── S-H05: 请求体大小限制分级（防止超大 body DoS） ──
  // 按路由设置不同限制：
  //   - /api/v1/projects：50mb（项目导入/页面保存需要大 body）
  //   - /api/v1/devices/import：10mb（设备批量导入）
  //   - 默认（含 AI 对话）：2mb
  app.use('/api/v1/projects', json({ limit: '50mb' }));
  app.use('/api/v1/projects', urlencoded({ limit: '50mb', extended: true }));
  app.use('/api/v1/devices', json({ limit: '10mb' }));
  app.use('/api/v1/devices', urlencoded({ limit: '10mb', extended: true }));
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // ── API 版本前缀 ──
  app.setGlobalPrefix('api/v1');
  endPhase2();

  // ──────── Phase 3: Swagger 文档 ────────
  const endPhase3 = startPhase('Phase 3: Swagger 文档生成');

  // S-M04: Swagger 文档环境隔离
  // - 开发环境：正常暴露 /api/docs
  // - 生产环境：仅当配置了 SWAGGER_USER + SWAGGER_PASSWORD 时暴露（HTTP Basic Auth 保护）
  //             未配置则完全禁用，防止 API 结构泄露
  const isProductionEnv = process.env.NODE_ENV === 'production';
  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  const enableSwagger = !isProductionEnv || (!!swaggerUser && !!swaggerPassword);

  const productMode = getProductMode();

  if (enableSwagger) {
    const swaggerTitleMap: Record<string, string> = {
      full: 'Smart SCADA Platform API',
      scada: 'ss-scada API',
      data: 'ss-data API',
    };
    const swaggerDescMap: Record<string, string> = {
      full: 'Smart SCADA Platform - 集成模式（ss-scada + ss-data 全部能力）',
      scada: 'ss-scada - 组态编辑器/运行器（仅共享 + scada 模块）',
      data: 'ss-data - 数据中台/系统管理（仅共享 + data 模块）',
    };
    const config = new DocumentBuilder()
      .setTitle(swaggerTitleMap[productMode] || 'Smart SCADA API')
      .setDescription(`${swaggerDescMap[productMode] || ''}\n\nProduct Mode: ${productMode}`)
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
      .addTag('auth', '认证授权')
      .addTag('projects', '项目管理')
      .addTag('devices', '设备管理')
      .addTag('tags', '数据标签')
      .addTag('alarms', '报警管理')
      .addTag('data', '数据查询')
      .addTag('system', '系统管理')
      .addTag('scripts', '脚本引擎')
      .addTag('realtime', '实时通信')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // 生产环境：用 HTTP Basic Auth 保护 /api/docs 及其 JSON 端点
    if (isProductionEnv && swaggerUser && swaggerPassword) {
      const swaggerAuthRealm = 'Smart SCADA API Docs';
      app.use(
        ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
        (req: Request, res: Response, next: NextFunction) => {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', `Basic realm="${swaggerAuthRealm}"`);
            res.status(401).send('Authentication required');
            return;
          }
          const encoded = authHeader.slice('Basic '.length);
          let decoded: string;
          try {
            decoded = Buffer.from(encoded, 'base64').toString('utf-8');
          } catch {
            res.setHeader('WWW-Authenticate', `Basic realm="${swaggerAuthRealm}"`);
            res.status(401).send('Invalid credentials');
            return;
          }
          const separatorIndex = decoded.indexOf(':');
          const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
          const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
          // 使用常量时间比较防止计时攻击
          if (
            user.length !== swaggerUser.length ||
            pass.length !== swaggerPassword.length ||
            !crypto.timingSafeEqual(Buffer.from(user), Buffer.from(swaggerUser)) ||
            !crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(swaggerPassword))
          ) {
            res.setHeader('WWW-Authenticate', `Basic realm="${swaggerAuthRealm}"`);
            res.status(401).send('Invalid credentials');
            return;
          }
          next();
        },
      );
      Logger.log('🔒 Swagger API Docs protected by HTTP Basic Auth', 'Swagger');
    }

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
      },
    });
    endPhase3();
  } else {
    console.warn(
      '[Startup] ⚠️ 生产环境未配置 SWAGGER_USER/SWAGGER_PASSWORD，API 文档已禁用。\n' +
        '  如需启用，请在 .env.pro 中配置 SWAGGER_USER 和 SWAGGER_PASSWORD。',
    );
    endPhase3();
  }

  // ──────── Phase 4: HTTP 监听启动 ────────
  const endPhase4 = startPhase('Phase 4: HTTP 服务监听（app.listen）');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  endPhase4();

  // ──────── Phase 5: HTTP keep-alive 调优 ────────
  // CODE-06: SQLite PRAGMA（journal_mode/synchronous/cache_size/temp_store）
  // 已迁移至 app.module.ts getDatabaseConfig() 的 extra.pragma，作用于连接池中所有连接
  // （原 ds.query('PRAGMA ...') 仅作用于单个连接，cache_size 优化实测未生效）。
  const endPhase5 = startPhase('Phase 5: HTTP keep-alive 调优');

  // ── Keep-Alive 超时延长到 65s（略大于 Nginx 默认 60s） ──
  const httpServer = app.getHttpServer();
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
  endPhase5();

  const totalElapsed = performance.now() - totalStart;

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Smart SCADA Server running on: http://localhost:${port}`);
  logger.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health Check: http://localhost:${port}/api/v1/system/health`);
  logger.log(`⚙️ Product Mode: ${productMode}`);
  logger.log(`⏱️ Total startup time: ${formatMs(totalElapsed)}`);

  // ASCII Art banner — 使用 console.log 确保在所有模式下可见（不受 Winston Console transport 控制）
  // 从 docs/00-全局/slogo/logo.txt 读取 3D ASCII 艺术字
  const logoPath = path.resolve(__dirname, 'assets/logo.txt');
  try {
    const logo = fs.readFileSync(logoPath, 'utf-8');
    console.log('');
    console.log(logo);
  } catch {
    // 文件不存在时回退到简单横幅
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║          Smart Site  v7              ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
  }
}

bootstrap();

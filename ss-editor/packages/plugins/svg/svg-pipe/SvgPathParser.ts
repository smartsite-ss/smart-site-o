// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'H'; x: number }
  | { type: 'V'; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'Z' };

const PATH_CMD_REGEX = /([MmLlHhVvCcQqZz])\s*([\d.\s,\-e]*)/g;

export function parseSvgPath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  let match: RegExpExecArray | null;
  let lastX = 0;
  let lastY = 0;
  let firstX = 0;
  let firstY = 0;

  PATH_CMD_REGEX.lastIndex = 0;

  while ((match = PATH_CMD_REGEX.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    const args = argsStr
      ? argsStr.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))
      : [];

    switch (cmd) {
      case 'M':
      case 'm':
        for (let i = 0; i < args.length; i += 2) {
          lastX = args[i];
          lastY = args[i + 1];
          if (i === 0) {
            firstX = lastX;
            firstY = lastY;
          }
          commands.push({ type: 'M', x: lastX, y: lastY });
        }
        break;
      case 'L':
      case 'l':
        for (let i = 0; i < args.length; i += 2) {
          lastX = args[i];
          lastY = args[i + 1];
          commands.push({ type: 'L', x: lastX, y: lastY });
        }
        break;
      case 'H':
        lastX = args[0];
        commands.push({ type: 'H', x: lastX });
        break;
      case 'V':
        lastY = args[0];
        commands.push({ type: 'V', y: lastY });
        break;
      case 'C':
        lastX = args[4];
        lastY = args[5];
        commands.push({ type: 'C', x1: args[0], y1: args[1], x2: args[2], y2: args[3], x: lastX, y: lastY });
        break;
      case 'Q':
      case 'q':
        lastX = args[2];
        lastY = args[3];
        commands.push({ type: 'Q', x1: args[0], y1: args[1], x: lastX, y: lastY });
        break;
      case 'Z':
      case 'z':
        lastX = firstX;
        lastY = firstY;
        commands.push({ type: 'Z' });
        break;
      default:
        break;
    }
  }

  return commands;
}

export function renderPathCommands(ctx: CanvasRenderingContext2D, commands: PathCommand[]): void {
  ctx.beginPath();
  let lastX = 0;
  let lastY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        ctx.moveTo(cmd.x, cmd.y);
        lastX = cmd.x;
        lastY = cmd.y;
        break;
      case 'L':
        ctx.lineTo(cmd.x, cmd.y);
        lastX = cmd.x;
        lastY = cmd.y;
        break;
      case 'H':
        ctx.lineTo(cmd.x, lastY);
        lastX = cmd.x;
        break;
      case 'V':
        ctx.lineTo(lastX, cmd.y);
        lastY = cmd.y;
        break;
      case 'C':
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        lastX = cmd.x;
        lastY = cmd.y;
        break;
      case 'Q':
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        lastX = cmd.x;
        lastY = cmd.y;
        break;
      case 'Z':
        ctx.closePath();
        break;
    }
  }
}
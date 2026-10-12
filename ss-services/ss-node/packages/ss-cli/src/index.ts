// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { CommandParser } from './core/CommandParser';
import { registerCommands as registerDeviceCommands } from './commands/device-commands';
import { registerCommands as registerDataCommands } from './commands/data-commands';
import { registerCommands as registerAlarmCommands } from './commands/alarm-commands';
import { registerCommands as registerProjectCommands } from './commands/project-commands';
import { registerCommands as registerSystemCommands } from './commands/system-commands';
import { registerCommands as registerCollectorCommands } from './commands/collector-commands';

const parser = new CommandParser();

// 注册内置基础命令
parser.registerCommands();

// 注册业务命令模块
registerDeviceCommands(parser);
registerDataCommands(parser);
registerAlarmCommands(parser);
registerProjectCommands(parser);
registerSystemCommands(parser);
registerCollectorCommands(parser);

parser.parse(process.argv);

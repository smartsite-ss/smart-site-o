// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { DeviceModule } from './device.module';

export { DeviceService, DeviceTree, DeviceSummary, DeviceStats } from './device.service';
export type { IDeviceService } from './device.interface';

export { DeviceDataService } from './data/device-data.service';

export { DeviceStateMachine } from './state/device-state-machine';
export type { StatusChangeEvent } from './state/device-state-machine';

export { ConnectionManagerService } from './connection/connection-manager.service';
export type { ActiveConnection } from './connection/connection-manager.service';

export { DeviceDiagnosticService } from './device-diagnostic.service';
export type { DeviceDiagnosticResult, AddressScanResult } from './device-diagnostic.service';

export { Device } from './entities/device.entity';
export { DataTag } from './entities/data-tag.entity';

export { TagDataType, DeadbandMode, ConversionType } from './entities/data-tag.entity';

export { DeviceGroup } from './entities/device-group.entity';
export { DeviceStatusLog } from './entities/device-status-log.entity';

export { CreateDeviceGroupDto } from './dto/create-device-group.dto';
export { UpdateDeviceGroupDto } from './dto/update-device-group.dto';

export { ChannelConfigService } from './channel/channel-config.service';
export { validateChannelConfig } from './channel/channel-config.validator';
export type {
  DeviceChannelConfig,
  ChannelProtocol,
  ModbusTcpChannel,
  ModbusRtuChannel,
  OpcUaChannel,
  MqttChannel,
  SiemensS7Channel,
} from './channel/channel-config.interface';

export { DeviceBackupService } from './backup/device-backup.service';
export type {
  DeviceBackup,
  DeviceBackupEntry,
  TagBackupEntry,
  GroupBackupEntry,
  BackupListItem,
  BackupValidationResult,
} from './backup/device-backup.service';

export { DeadbandFilterService } from './filter/deadband-filter.service';
export type { DeadbandFilterResult } from './filter/deadband-filter.service';

export { DeviceArchiveService } from './archive/device-archive.service';
export type {
  ArchiveOptions,
  ArchiveQueryOptions,
  ArchivedDataPoint,
  ArchiveStatus,
  ArchiveStatistics,
} from './archive/device-archive.service';

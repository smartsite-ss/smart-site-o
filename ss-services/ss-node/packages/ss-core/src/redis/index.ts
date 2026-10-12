// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { RedisModule } from './redis.module';
export {
  REDIS_CLIENT_DEFAULT,
  REDIS_CLIENT_OFFLINE,
  REDIS_CLIENT_PURPOSE,
  type RedisClientToken,
} from './redis.constants';
export { createRedisClient, closeRedisClient } from './redis.client-factory';

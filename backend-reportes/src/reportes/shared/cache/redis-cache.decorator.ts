import { SetMetadata } from "@nestjs/common";

export const CACHE_TTL_METADATA = "redis_cache_ttl";
export const CACHE_KEY_METADATA = "redis_cache_key";

export const UseRedisCache = (
  keyPattern: string,
  ttlSeconds: number = 3600,
) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, keyPattern)(target, key, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttlSeconds)(target, key, descriptor);
  };
};

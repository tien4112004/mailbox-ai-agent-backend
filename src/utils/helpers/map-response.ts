import { plainToInstance } from 'class-transformer';

/**
 * 🐍 Convert all keys in object from camelCase → snake_case (đệ quy)
 */
export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

/**
 * 🐫 Convert all keys in object from snake_case → camelCase (đệ quy)
 */
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

/**
 * 🎯 Generic mapper — chuyển dữ liệu thô sang DTO (class) với hỗ trợ convert key
 *
 * @param cls - class cần map tới (VD: PersonalInfoResponse)
 * @param data - object dữ liệu thô (VD: UserProfile)
 * @param options.convertCase - 'snake' để chuyển key sang snake_case, 'camel' để sang camelCase
 */
export function mapToResponse<T>(
  cls: new (...args: any[]) => T,
  data: any,
  options?: { convertCase?: 'snake' | 'camel' },
): T {
  let transformed = data;
  if (options?.convertCase === 'snake') transformed = toSnakeCase(data);
  if (options?.convertCase === 'camel') transformed = toCamelCase(data);

  return plainToInstance(cls, transformed, { excludeExtraneousValues: true });
}

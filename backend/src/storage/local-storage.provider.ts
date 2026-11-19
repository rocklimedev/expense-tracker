import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from './storage.interface';

export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;

  constructor(config: ConfigService) {
    this.basePath = path.resolve(config.get<string>('LOCAL_STORAGE_PATH', '.receipt-storage'));
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.filePath(key);
    const temporary = `${target}.${randomUUID()}.part`;
    await this.run(async () => {
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await writeFile(temporary, data, { flag: 'wx', mode: 0o600 });
        await rename(temporary, target);
      } finally {
        await rm(temporary, { force: true }).catch(() => undefined);
      }
    });
  }

  async get(key: string): Promise<Buffer> {
    return this.run(() => readFile(this.filePath(key)));
  }

  async delete(key: string): Promise<void> {
    await this.run(() => rm(this.filePath(key), { force: true }));
  }

  private filePath(key: string): string {
    const segments = key.split('/');
    if (segments.some((segment) => !/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)?$/i.test(segment))) {
      throw new Error('Invalid storage key');
    }
    return path.join(this.basePath, ...segments);
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      this.logger.error(`Local storage operation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('File storage is unavailable');
    }
  }
}

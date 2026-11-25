import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as path from 'path';
import SftpClient from 'ssh2-sftp-client';
import { StorageProvider } from './storage.interface';

@Injectable()
export class SftpStorageProvider implements StorageProvider {
  private readonly logger = new Logger(SftpStorageProvider.name);
  private readonly basePath: string;
  private readonly connectionOptions: SftpClient.ConnectOptions;

  constructor(config: ConfigService) {
    this.basePath = config.getOrThrow<string>('SFTP_BASE_PATH').replace(/\/+$/, '');

    const inlineKey = config.get<string>('SFTP_PRIVATE_KEY')?.trim();
    const keyPath = config.get<string>('SFTP_PRIVATE_KEY_PATH');
    const privateKey = inlineKey
      ? inlineKey.replace(/\\n/g, '\n') + '\n'
      : keyPath
        ? this.readPrivateKey(keyPath)
        : undefined;
    this.connectionOptions = {
      host: config.getOrThrow<string>('SFTP_HOST'),
      port: Number(config.get('SFTP_PORT', 22)),
      username: config.getOrThrow<string>('SFTP_USER'),
      ...(privateKey
        ? { privateKey }
        : { password: config.getOrThrow<string>('SFTP_PASSWORD') }),
      readyTimeout: 10_000,
    };
  }

  private readPrivateKey(keyPath: string): Buffer {
    const resolvedPath = path.resolve(keyPath);
    try {
      return readFileSync(resolvedPath);
    } catch (cause) {
      throw new Error(
        `Cannot read SFTP private key at ${resolvedPath} (${(cause as NodeJS.ErrnoException).code}). ` +
          'Set SFTP_PRIVATE_KEY to the inline key, use a readable SFTP_PRIVATE_KEY_PATH, or configure SFTP_PASSWORD.',
      );
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const remote = this.remotePath(key);
    const tmp = `${remote}.part`;

    await this.withClient(async (sftp) => {
      await sftp.mkdir(path.posix.dirname(remote), true);
      // Write a temp name, then rename, so a half-written file never appears under its final name
      await sftp.put(data, tmp);
      await sftp.rename(tmp, remote);
    });
  }

  async get(key: string): Promise<Buffer> {
    const remote = this.remotePath(key);
    return this.withClient(async (sftp) => (await sftp.get(remote)) as Buffer);
  }

  async delete(key: string): Promise<void> {
    const remote = this.remotePath(key);
    await this.withClient((sftp) => sftp.delete(remote));
  }

  private remotePath(key: string): string {
    // Keys are generated server-side, but guard against traversal anyway
    if (key.includes('..') || path.posix.isAbsolute(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return `${this.basePath}/${key}`;
  }

  /** One connection per operation keeps things simple and avoids stale sessions. */
  private async withClient<T>(fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
    const sftp = new SftpClient();
    try {
      await sftp.connect(this.connectionOptions);
      return await fn(sftp);
    } catch (err) {
      this.logger.error(`SFTP operation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('File storage is unavailable');
    } finally {
      await sftp.end().catch(() => undefined);
    }
  }
}

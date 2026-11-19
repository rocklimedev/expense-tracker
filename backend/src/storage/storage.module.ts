import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { SftpStorageProvider } from './sftp-storage.provider';
import { STORAGE_PROVIDER } from './storage.interface';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('STORAGE_DRIVER', 'sftp');
        switch (driver) {
          case 'local':
            return new LocalStorageProvider(config);
          case 'sftp':
            return new SftpStorageProvider(config);
          default:
            throw new Error('STORAGE_DRIVER must be local or sftp');
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}

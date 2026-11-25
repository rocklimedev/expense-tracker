import { Module } from '@nestjs/common';
import { SftpStorageProvider } from './sftp-storage.provider';
import { STORAGE_PROVIDER } from './storage.interface';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: SftpStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaymentsModule } from './payments/payments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { TrackersModule } from './trackers/trackers.module';
import { ActivityController } from './activity/activity.controller';
import { ActivityEntry } from './activity/activity-entry.model';
import { ActivityInterceptor } from './activity/activity.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadModels: true,
        // Development only. Use Sequelize migrations in production.
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: false,
        timezone: '+00:00',
      }),
    }),
    AuthModule,
    UsersModule,
    ApprovalsModule,
    ExpensesModule,
    PaymentsModule,
    AttachmentsModule,
    TrackersModule,
    SequelizeModule.forFeature([ActivityEntry]),
  ],
  controllers: [ActivityController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ActivityInterceptor }],
})
export class AppModule {}

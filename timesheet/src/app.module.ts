import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegrafModule } from 'nestjs-telegraf';
import { AuthModule } from './auth/auth.module';
import { ChangeLogsModule } from './change_logs/change-logs.module';
import { AllExceptionsFilter } from './common/AllExceptionsFilter/AllExceptionsFilter';
import { EmployeeModule } from './employee/employee.module';
import { EmploymentPeriodsModule } from './employment-periods/employment-periods.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { FacilityPeriodsModule } from './facility-periods/facility-periods.module';
import { MasterPeriodsModule } from './master-periods/master-periods.module';
import { MasterFacilitiesModule } from './master_facilities/master-facilities.module';
import { OutOfTownPeriodsModule } from './out-of-town-periods/out-of-town-periods.module';
import { PositionPeriodsModule } from './position-periods/position-periods.module';
import { PositionsFacilityModule } from './positions-facility/positions-facility.module';
import { PositionsModule } from './positions/positions.module';
import { ProductionCalendarModule } from './production-calendar/production-calendar.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { WorkLogsModule } from './work_logs/work-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.PG_HOST,
      port: +process.env.PG_PORT,
      username: process.env.PG_USERNAME,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      autoLoadModels: true,
      synchronize: true, // TODO: set to false after initial deployment and add migrations
      logging: false,
      // logging: console.log,
    }),
    ...(process.env.TG_API_TOKEN
      ? [TelegrafModule.forRoot({ token: process.env.TG_API_TOKEN })]
      : []),
    AuthModule,
    UsersModule,
    RolesModule,
    FacilitiesModule,
    MasterFacilitiesModule,
    EmployeeModule,
    PositionsModule,
    WorkLogsModule,
    ChangeLogsModule,
    EmploymentPeriodsModule,
    FacilityPeriodsModule,
    MasterPeriodsModule,
    PositionPeriodsModule,
    OutOfTownPeriodsModule,
    PositionsFacilityModule,
    ProductionCalendarModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}

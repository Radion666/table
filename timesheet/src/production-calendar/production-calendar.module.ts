import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesModule } from 'src/roles/roles.module';
import { UsersModule } from 'src/users/users.module';
import { ProductionCalendarController } from './production-calendar.controller';
import { ProductionCalendar } from './production-calendar.model';
import { ProductionCalendarService } from './production-calendar.service';

@Module({
  controllers: [ProductionCalendarController],
  providers: [ProductionCalendarService],
  imports: [
    SequelizeModule.forFeature([ProductionCalendar]),
    forwardRef(() => AuthModule),
    AuthModule,
    UsersModule,
    RolesModule,
  ],
})
export class ProductionCalendarModule {}

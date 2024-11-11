import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { ProductionCalendar } from 'src/production-calendar/production-calendar.model';
import { Roles } from 'src/roles/role.model';
import { RolesModule } from 'src/roles/roles.module';
import { User } from 'src/users/user.model';
import { UsersModule } from 'src/users/users.module';
import { FacilitiesController } from './facilities.controller';
import { Facilities } from './facilities.model';
import { FacilitiesService } from './facilities.service';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  imports: [
    SequelizeModule.forFeature([
      Facilities,
      MasterFacilities,
      Roles,
      User,
      ProductionCalendar,
    ]),
    AuthModule,
    RolesModule,
    UsersModule,
  ],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}

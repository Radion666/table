import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesGuards } from 'src/auth/roles.guard';
import { EmploymentPeriod } from 'src/employment-periods/employment-periods.model';
import { Facilities } from 'src/facilities/facilities.model';
import { FacilityPeriod } from 'src/facility-periods/facility-periods.model';
import { MasterPeriod } from 'src/master-periods/master-periods.model';
import { MasterFacilities } from 'src/master_facilities/master-facilities.model';
import { OutOfTownPeriod } from 'src/out-of-town-periods/out-of-town-periods';
import { PositionPeriod } from 'src/position-periods/position-periods.model';
import { Positions } from 'src/positions/positions.model';
import { Roles } from 'src/roles/role.model';
import { RolesModule } from 'src/roles/roles.module';
import { User } from 'src/users/user.model';
import { UsersModule } from 'src/users/users.module';
import { EmployeeController } from './employee.controller';
import { Employee } from './employee.model';
import { EmployeeService } from './employee.service';

@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService, RolesGuards],
  imports: [
    CacheModule.register(),
    SequelizeModule.forFeature([
      Employee,
      User,
      Facilities,
      Roles,
      Positions,
      EmploymentPeriod,
      FacilityPeriod,
      MasterPeriod,
      OutOfTownPeriod,
      PositionPeriod,
      MasterFacilities,
    ]),
    AuthModule,
    RolesModule,
    UsersModule,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}

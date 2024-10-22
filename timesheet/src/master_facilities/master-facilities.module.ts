import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesGuards } from 'src/auth/roles.guard';
import { FacilitiesModule } from 'src/facilities/facilities.module';
import { RolesModule } from 'src/roles/roles.module';
import { UsersModule } from 'src/users/users.module';
import { MasterFacilitiesController } from './master-facilities.controller';
import { MasterFacilities } from './master-facilities.model';
import { MasterFacilitiesService } from './master_facilities.service';

@Module({
  controllers: [MasterFacilitiesController],
  providers: [MasterFacilitiesService, RolesGuards],
  imports: [
    SequelizeModule.forFeature([MasterFacilities]),
    AuthModule,
    RolesModule,
    UsersModule,
    FacilitiesModule,
  ],
  exports: [MasterFacilitiesService],
})
export class MasterFacilitiesModule {}

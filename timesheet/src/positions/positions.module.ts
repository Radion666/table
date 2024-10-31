import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { Facilities } from 'src/facilities/facilities.model';
import { PositionFacility } from 'src/positions-facility/positions-facility.model';
import { RolesModule } from 'src/roles/roles.module';
import { UsersModule } from 'src/users/users.module';
import { PositionsController } from './positions.controller';
import { Positions } from './positions.model';
import { PositionsService } from './positions.service';

@Module({
  controllers: [PositionsController],
  providers: [PositionsService],
  imports: [
    SequelizeModule.forFeature([Positions, Facilities, PositionFacility]),
    AuthModule,
    RolesModule,
    UsersModule,
  ],
  exports: [PositionsService],
})
export class PositionsModule {}

import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesGuards } from 'src/auth/roles.guard';
import { Positions } from 'src/positions/positions.model';
import { Roles } from 'src/roles/role.model';
import { RolesModule } from 'src/roles/roles.module';
import { User } from './user.model';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesGuards],
  imports: [
    SequelizeModule.forFeature([User, Positions, Roles]),
    forwardRef(() => AuthModule),
    RolesModule,
  ],
  exports: [UsersService],
})
export class UsersModule {}

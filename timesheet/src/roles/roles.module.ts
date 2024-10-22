import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesGuards } from 'src/auth/roles.guard';
import { UsersModule } from 'src/users/users.module';
import { Roles } from './role.model';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesGuards],
  exports: [RolesService],
  imports: [
    SequelizeModule.forFeature([Roles]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
})
export class RolesModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { RolesModule } from 'src/roles/roles.module';
import { UsersModule } from 'src/users/users.module';
import { ChangeLogsController } from './change-logs.controller';
import { ChangeLog } from './change-logs.model';
import { ChangeLogsService } from './change-logs.service';

@Module({
  controllers: [ChangeLogsController],
  providers: [ChangeLogsService],
  imports: [
    SequelizeModule.forFeature([ChangeLog]),
    AuthModule,
    RolesModule,
    UsersModule,
  ],
})
export class ChangeLogsModule {}

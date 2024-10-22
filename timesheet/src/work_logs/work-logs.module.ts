import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/auth/auth.module';
import { ChangeLog } from 'src/change_logs/change-logs.model';
import { ChangeLogsService } from 'src/change_logs/change-logs.service';
import { Employee } from 'src/employee/employee.model';
import { Facilities } from 'src/facilities/facilities.model';
import { Roles } from 'src/roles/role.model';
import { RolesModule } from 'src/roles/roles.module';
import { User } from 'src/users/user.model';
import { UsersModule } from 'src/users/users.module';
import { WorkLogsController } from './work-logs.controller';
import { WorkLog } from './work-logs.model';
import { WorkLogsService } from './work-logs.service';

@Module({
  controllers: [WorkLogsController],
  providers: [WorkLogsService, ChangeLogsService],
  imports: [
    SequelizeModule.forFeature([
      WorkLog,
      Facilities,
      ChangeLog,
      Employee,
      User,
      Roles,
    ]),
    forwardRef(() => AuthModule),
    AuthModule,
    UsersModule,
    RolesModule,
  ],
})
export class WorkLogsModule {}

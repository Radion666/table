import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeModule } from 'src/employee/employee.module';
import { EmploymentPeriod } from './employment-periods.model';

@Module({
  providers: [],
  imports: [SequelizeModule.forFeature([EmploymentPeriod]), EmployeeModule],
})
export class EmploymentPeriodsModule {}

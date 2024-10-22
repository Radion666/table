import { InjectModel } from '@nestjs/sequelize';
import { EmploymentPeriod } from './employment-periods.model';

export class EmploymentPeriodsService {
  constructor(
    @InjectModel(EmploymentPeriod)
    private employmentPeriodModel: typeof EmploymentPeriod,
  ) {}
}

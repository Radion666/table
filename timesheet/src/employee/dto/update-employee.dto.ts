import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['createdById']),
) {}

export class UpdateEmployeeDtoFromWorkLogs extends PartialType(
  PickType(CreateEmployeeDto, [
    'firstName',
    'lastName',
    'middleName',
    'positionId',
    'status',
    'isOutOfTown',
    'registeredAddress',
    'actualAddress',
    'facilityId',
  ]),
) {}

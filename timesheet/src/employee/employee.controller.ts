import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { UserDecorator } from 'src/common/UserDecorator/UserDecorator';
import { EmploymentStatus } from 'src/employment-periods/employment-periods.model';
import { User } from 'src/users/user.model';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeService } from './employee.service';

@Controller('employees')
@ApiTags('Сотрудники')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuards)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Roles('admin', 'master')
  @UseGuards(RolesGuards)
  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Roles('admin', 'master')
  @Get()
  @ApiQuery({
    name: 'searchName',
    type: String,
    description: 'Поиск по ФИО',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    type: String,
    description: 'Статус сотрудников',
    required: false,
  })
  findAll(
    @UserDecorator() user: User,
    @Query('searchName') searchName?: string,
    @Query('status') status?: EmploymentStatus,
  ) {
    return this.employeeService.findAll(user, searchName, status);
  }

  @Roles('admin', 'master')
  @UseGuards(RolesGuards)
  @Get('/byFacilities')
  findByFacility(
    @Query('facilityId') facilityId: number,
    @Query('date') date: string,
  ) {
    return this.employeeService.findByFacilityId(facilityId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(+id);
  }

  @Roles('admin', 'master')
  @UseGuards(RolesGuards)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(+id, updateEmployeeDto);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.employeeService.remove(+id);
  // }
}

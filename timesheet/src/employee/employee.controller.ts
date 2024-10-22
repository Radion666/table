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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
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

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  findAll() {
    return this.employeeService.findAll();
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

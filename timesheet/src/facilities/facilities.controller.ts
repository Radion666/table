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
import { UserDecorator } from 'src/common/UserDecorator/UserDecorator';
import { User } from 'src/users/user.model';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesService } from './facilities.service';

@ApiTags('Объекты')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'master', 'personnel_officer')
@UseGuards(RolesGuards)
@ApiBearerAuth()
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  create(@Body() createFacilityDto: CreateFacilityDto) {
    return this.facilitiesService.create(createFacilityDto);
  }

  @Roles('admin', 'master', 'personnel_officer', 'financier')
  @Get()
  findAll(
    @UserDecorator() user: User,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.facilitiesService.findAll(user, page, pageSize);
  }

  @Roles('admin', 'master', 'personnel_officer', 'financier')
  @Get(':id/:year/:month')
  findOne(
    @Param('id') id: string,
    @Param('year') year?: number,
    @Param('month') month?: number,
  ) {
    return this.facilitiesService.findOne(+id, +year, +month);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFacilityDto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(+id, updateFacilityDto);
  }
}

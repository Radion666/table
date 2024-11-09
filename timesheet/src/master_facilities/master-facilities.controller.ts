import {
  Body,
  Controller,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { CreateMasterFacilityDto } from './dto/create-master-with-facility';
import { UpdateMasterFacilityDto } from './dto/update-master-with-facility.dto';
import { MasterFacilitiesService } from './master_facilities.service';

@ApiTags('Мастеры - объекты')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'personnel_officer')
@UseGuards(RolesGuards)
@ApiBearerAuth()
@Controller('master-facilities')
export class MasterFacilitiesController {
  constructor(
    private readonly masterFacilitiesService: MasterFacilitiesService,
  ) {}

  @Post()
  createMasterWithFactories(
    @Body() createMasterFacility: CreateMasterFacilityDto,
  ) {
    return this.masterFacilitiesService.createMasterWithFactories(
      createMasterFacility,
    );
  }
  @Patch()
  updateMasterWithFactories(
    @Query('id') id: number,
    @Body() updateMasterFacility: UpdateMasterFacilityDto,
  ) {
    return this.masterFacilitiesService.updateMasterFacility(
      id,
      updateMasterFacility,
    );
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { FacilitiesService } from 'src/facilities/facilities.service';
import { RolesService } from 'src/roles/roles.service';
import { UsersService } from 'src/users/users.service';
import { CreateMasterFacilityDto } from './dto/create-master-with-facility';
import { UpdateMasterFacilityDto } from './dto/update-master-with-facility.dto';
import { MasterFacilities } from './master-facilities.model';

@Injectable()
export class MasterFacilitiesService {
  constructor(
    @InjectModel(MasterFacilities)
    private masterFacilitiesRepository: typeof MasterFacilities,
    private userRepository: UsersService,
    private facilitiesRepository: FacilitiesService,
    private rolesRepository: RolesService,
  ) {}
  async createMasterWithFactories(
    createMasterFacility: CreateMasterFacilityDto,
  ) {
    if (!createMasterFacility.mastersIds?.length) {
      throw new HttpException(
        'Не был передан id мастера',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!createMasterFacility.facility_id) {
      throw new HttpException(
        'Не был передан id объекта',
        HttpStatus.BAD_REQUEST,
      );
    }

    const facility_id = createMasterFacility.facility_id;

    for (let i = 0; i < createMasterFacility?.mastersIds?.length; i++) {
      const master = createMasterFacility?.mastersIds?.[i];
      if (!(await this.userRepository.getUserByPk(master))) {
        throw new HttpException('Мастер не найден', HttpStatus.BAD_REQUEST);
      }
    }

    const mastersIds = createMasterFacility.mastersIds;

    await this.facilitiesRepository.findOne(createMasterFacility.facility_id);

    const existingRelations = await this.masterFacilitiesRepository.findAll({
      where: { facility_id },
    });

    const existingMasterIds = existingRelations.map(
      (relation) => relation.master_id,
    );

    const mastersToAdd = mastersIds.filter(
      (id) => !existingMasterIds.includes(id),
    );

    const mastersToRemove = existingMasterIds.filter(
      (id) => !mastersIds.includes(id),
    );

    if (mastersToAdd.length > 0) {
      const newRelations = mastersToAdd.map((master_id) => ({
        master_id,
        facility_id,
      }));

      await this.masterFacilitiesRepository.bulkCreate(newRelations);
    }

    if (mastersToRemove.length > 0) {
      await this.masterFacilitiesRepository.destroy({
        where: {
          master_id: { [Op.in]: mastersToRemove },
          facility_id,
        },
      });
    }
  }

  async updateMasterFacility(
    id: number,
    updateMasterFacility: UpdateMasterFacilityDto,
  ) {
    if (!id) {
      throw new HttpException(
        'ID объекта не был передан',
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentFacility = await this.masterFacilitiesRepository.findOne({
      where: {
        facility_id: id,
      },
    });

    if (
      Array.isArray(updateMasterFacility?.mastersIds) &&
      updateMasterFacility?.mastersIds?.length === 0
    ) {
      if (currentFacility) {
        return this?.masterFacilitiesRepository?.destroy({
          where: {
            facility_id: id,
          },
        });
      }

      return;
    }

    if (!currentFacility) {
      const newRelations = updateMasterFacility.mastersIds.map((master_id) => ({
        facility_id: id,
        master_id,
      }));

      return await this.masterFacilitiesRepository.bulkCreate(newRelations);
    }

    const existingUsers = [];

    for (const masterId of updateMasterFacility.mastersIds) {
      const user = await this.userRepository.getUserByPk(masterId);

      if (user) {
        const userRole = await this.rolesRepository.findById(user.role_id);

        if (userRole !== 'master') {
          throw new HttpException(
            `Пользователь ${user.id} не обладает ролью мастера`,
            HttpStatus.BAD_REQUEST,
          );
        }
        existingUsers.push(user);
      } else {
        throw new HttpException(
          `Пользователь с ID ${masterId} не найден.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.facilitiesRepository.findOne(id);

    const existingRelations = await this.masterFacilitiesRepository.findAll({
      where: { facility_id: id },
    });

    const existingMasterIds = existingRelations.map(
      (relation) => relation.master_id,
    );

    const mastersToUpdate = updateMasterFacility.mastersIds;

    const mastersToAdd = mastersToUpdate.filter(
      (id) => !existingMasterIds.includes(id),
    );

    const mastersToRemove = existingMasterIds.filter(
      (id) => !mastersToUpdate.includes(id),
    );

    for (const master_id of mastersToUpdate) {
      await this.masterFacilitiesRepository.update(
        { master_id },
        {
          where: {
            facility_id: id,
            master_id: master_id,
          },
          returning: true,
        },
      );
    }

    if (mastersToAdd.length > 0) {
      const newRelations = mastersToAdd.map((master_id) => ({
        master_id,
        facility_id: id,
      }));

      await this.masterFacilitiesRepository.bulkCreate(newRelations);
    }

    if (mastersToRemove.length > 0) {
      await this.masterFacilitiesRepository.destroy({
        where: {
          master_id: { [Op.in]: mastersToRemove },
          facility_id: id,
        },
      });
    }
    const updatedRelations = await this.masterFacilitiesRepository.findAll({
      where: { facility_id: id },
    });
    return updatedRelations;
  }
}

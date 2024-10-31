import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Facilities } from 'src/facilities/facilities.model';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Positions } from './positions.model';

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Positions) private positionRepository: typeof Positions,
    @InjectModel(Facilities)
    private facilitiesModel: typeof Facilities,
  ) {}

  async validateFacilityIds(facilityIds: number[]) {
    if (facilityIds?.length) {
      for (let i = 0; i < facilityIds?.length; i++) {
        const facility = facilityIds[i];

        if (await this.facilitiesModel.findByPk(facility)) {
          continue;
        } else {
          throw new BadRequestException(
            `Не существует объекта с id - ${facility}`,
          );
        }
      }
    }
  }

  async checkForUnique(name: string, id?: number) {
    const isExists = await this.positionRepository.findOne({
      where: {
        name: name,
      },
    });
    if (isExists && isExists?.id !== id) {
      throw new HttpException(
        'Такое имя должности уже используется',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(createPositionDto: CreatePositionDto) {
    await this.checkForUnique(createPositionDto.name);
    await this.validateFacilityIds(createPositionDto.facilities);

    const position = await this.positionRepository.create({
      name: createPositionDto.name,
    });

    if (
      createPositionDto.facilities &&
      createPositionDto.facilities.length > 0
    ) {
      await position.$set('facilities', createPositionDto.facilities);
    }

    return position;
  }

  findAll() {
    return this.positionRepository.findAll({
      include: [
        {
          model: Facilities,
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });
  }

  async findByFacilityId(facilityId: number) {
    return this.positionRepository.findAll({
      include: [
        {
          model: Facilities,
          where: { id: facilityId },
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: ['id', 'name', 'createdAt', 'updatedAt'],
    });
  }

  findOne(id: number) {
    return this.positionRepository.findByPk(id);
  }

  async update(id: number, updatePositionDto: UpdatePositionDto) {
    await this.checkForUnique(updatePositionDto.name, id);
    await this.validateFacilityIds(updatePositionDto.facilities);

    const [_, [updatedPosition]] = await this.positionRepository.update(
      {
        name: updatePositionDto.name,
      },
      {
        where: { id },
        returning: true,
      },
    );

    if (
      updatePositionDto.facilities &&
      updatePositionDto.facilities.length > 0
    ) {
      await updatedPosition.$set('facilities', updatePositionDto.facilities); // Обновляем связи с объектами facilities
    }

    return updatedPosition;
  }

  remove(id: number) {
    return `This action removes a #${id} position`;
  }
}

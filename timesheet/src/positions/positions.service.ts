import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Positions } from './positions.model';

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Positions) private positionRepository: typeof Positions,
  ) {}

  async checkForUnique(name: string) {
    const isExists = await this.positionRepository.findOne({
      where: {
        name: name,
      },
    });
    if (isExists) {
      throw new HttpException(
        'Такое имя должности уже используется',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(createPositionDto: CreatePositionDto) {
    await this.checkForUnique(createPositionDto.name);

    return this.positionRepository.create({
      name: createPositionDto.name,
    });
  }

  findAll() {
    return this.positionRepository.findAll();
  }

  findOne(id: number) {
    return this.positionRepository.findByPk(id);
  }

  async update(id: number, updatePositionDto: UpdatePositionDto) {
    await this.checkForUnique(updatePositionDto.name);

    const [_, [updatedPosition]] = await this.positionRepository.update(
      {
        name: updatePositionDto.name,
      },
      {
        where: {
          id,
        },
        returning: true,
      },
    );
    return updatedPosition;
  }

  remove(id: number) {
    return `This action removes a #${id} position`;
  }
}

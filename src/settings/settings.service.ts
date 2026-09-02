import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AppSettings } from './entities/app-settings.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepository: Repository<AppSettings>,
  ) {}

  async getSettings(): Promise<AppSettings> {
    try {
      return await this.getOrCreate();
    } catch (error) {
      this.logger.error('Error al obtener la configuración', this.stack(error));
      throw new InternalServerErrorException(
        'No se pudo obtener la configuración',
      );
    }
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
    try {
      const settings = await this.getOrCreate();
      settings.alertThresholdMinutes = dto.alertThresholdMinutes;
      return await this.settingsRepository.save(settings);
    } catch (error) {
      this.logger.error(
        'Error al actualizar la configuración',
        this.stack(error),
      );
      throw new InternalServerErrorException(
        'No se pudo actualizar la configuración',
      );
    }
  }

  // Single-row config table: no seed step, the first read creates the row
  // with the entity's defaults.
  private async getOrCreate(): Promise<AppSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.settingsRepository.save(this.settingsRepository.create({}));
  }

  private stack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}

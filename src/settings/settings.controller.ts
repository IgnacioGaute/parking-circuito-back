import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AppSettings } from './entities/app-settings.entity';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(): Promise<AppSettings> {
    return this.settingsService.getSettings();
  }

  @Roles(Role.ADMIN)
  @Patch()
  updateSettings(@Body() dto: UpdateSettingsDto): Promise<AppSettings> {
    return this.settingsService.updateSettings(dto);
  }
}

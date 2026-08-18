import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.ts';

@Controller('api/v2')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getStatus();
  }
}

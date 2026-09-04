import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { IosSessionExchangeInput } from 'src/engine/core-modules/auth/dto/ios-session-exchange.input';
import { IosSessionExchangeService } from 'src/engine/core-modules/auth/services/ios-session-exchange.service';

@Controller('internal/ios/v1')
export class IosSessionExchangeController {
  constructor(
    private readonly iosSessionExchangeService: IosSessionExchangeService,
  ) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  exchange(
    @Headers('authorization') authorization: string | undefined,
    @Body() _input: IosSessionExchangeInput,
  ) {
    return this.iosSessionExchangeService.exchange(authorization);
  }
}

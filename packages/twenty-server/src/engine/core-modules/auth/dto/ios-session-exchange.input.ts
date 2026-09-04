import { IsIn, IsString } from 'class-validator';

export class IosSessionExchangeInput {
  @IsString()
  @IsIn(['/objects/people'])
  return_path: '/objects/people';
}

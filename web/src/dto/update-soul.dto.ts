import { PartialType } from '@nestjs/mapped-types';
import { CreateSoulDto } from './create-soul.dto';

export class UpdateSoulDto extends PartialType(CreateSoulDto) {}

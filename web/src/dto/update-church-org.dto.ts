import { PartialType } from '@nestjs/mapped-types';
import { CreateChurchOrgDto } from './create-church-org.dto';

export class UpdateChurchOrgDto extends PartialType(CreateChurchOrgDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateFollowUpDto } from './create-follow-up.dto';

export class UpdateFollowUpDto extends PartialType(CreateFollowUpDto) {}

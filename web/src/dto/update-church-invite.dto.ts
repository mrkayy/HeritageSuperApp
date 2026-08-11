import { PartialType } from '@nestjs/mapped-types';
import { CreateChurchInviteDto } from './create-church-invite.dto';

export class UpdateChurchInviteDto extends PartialType(CreateChurchInviteDto) {}

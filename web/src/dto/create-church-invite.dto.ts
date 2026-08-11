import { IsEmail, IsString } from 'class-validator';

export class CreateChurchInviteDto {
  @IsString()
  @IsEmail()
  email!: string;
}

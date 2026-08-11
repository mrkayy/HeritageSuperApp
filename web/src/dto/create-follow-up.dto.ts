import { IsEmail, IsString } from 'class-validator';

export class CreateFollowUpDto {
  @IsString()
  @IsEmail()
  email!: string;
}

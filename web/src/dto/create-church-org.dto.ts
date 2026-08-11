import { IsNotEmpty, IsString } from 'class-validator';

export class CreateChurchOrgDto {
  @IsString()
  @IsNotEmpty()
  centerName!: string;
}

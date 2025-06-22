import { IsString, IsNumber, IsNotEmpty, Min, IsOptional, IsBoolean, IsUrl, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  sellerMessage?: string;

  @IsOptional()
  @IsBoolean()
  rentAvailable?: boolean;

  @IsOptional()
  @IsString()
  imageFileId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageFileIds?: string[];
}
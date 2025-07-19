import { IsEmail, IsString, MinLength, IsOptional, ValidateIf } from 'class-validator';
import { IsStrongPassword } from './password.validator';
import { Match } from './match.decorator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Username must be at least 2 characters long' })
  username: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;

  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  passwordConfirm: string;

  @IsString()
  role: 'customer' | 'shop_owner' | 'admin';

  @IsString()
  @ValidateIf(o => o.role === 'customer')
  @IsOptional()
  firstName?: string;

  @IsString()
  @ValidateIf(o => o.role === 'customer')
  @IsOptional()
  lastName?: string;

  @IsString()
  @ValidateIf(o => o.role === 'shop_owner')
  @IsOptional()
  shopName?: string;

  @IsString()
  @ValidateIf(o => o.role === 'shop_owner')
  @IsOptional()
  location?: string;
}

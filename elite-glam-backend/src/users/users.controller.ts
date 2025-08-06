import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Get('username/:username')
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.getUserByUsername(username);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.usersService.getDashboardStats();
  }
}
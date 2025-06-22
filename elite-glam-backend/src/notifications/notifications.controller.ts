import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { NotificationsService, Notification } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @Req() req: AuthenticatedRequest,
  ): Promise<Notification[]> {
    return this.notificationsService.getUserNotifications(req.user.uid);
  }

  @Get('unread-count')
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(req.user.uid);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAsRead(notificationId, req.user.uid);
    return { message: 'Notification marked as read' };
  }

  @Patch('mark-all-read')
  async markAllAsRead(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAllAsRead(req.user.uid);
    return { message: 'All notifications marked as read' };
  }
}
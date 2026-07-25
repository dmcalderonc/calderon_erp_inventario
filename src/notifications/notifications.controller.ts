import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: { user: JwtPayload }) {
    return this.notificationsService.findAll(req.user.rol, req.user.id);
  }

  @Get('unread-count')
  countUnread(@Req() req: { user: JwtPayload }) {
    return this.notificationsService.countUnread(req.user.rol, req.user.id).then(count => ({ count }));
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: JwtPayload }) {
    return this.notificationsService.markAllAsRead(req.user.rol, req.user.id);
  }
}

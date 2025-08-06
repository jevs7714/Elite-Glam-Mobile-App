import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { ImageKitModule } from '../imagekit/imagekit.module';
import { EmailModule } from '../email/email.module';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [FirebaseModule, ImageKitModule, EmailModule],
  controllers: [AuthController],
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class AuthModule {}
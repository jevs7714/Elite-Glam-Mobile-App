import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { ImageKitModule } from '../imagekit/imagekit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [FirebaseModule, ImageKitModule, EmailModule],
  controllers: [AuthController],
})
export class AuthModule {}
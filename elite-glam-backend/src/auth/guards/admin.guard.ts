import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get the user from Firestore to check their role
    const userRecord = await this.firebaseService.getUserByUid(user.uid);

    if (!userRecord) {
      throw new UnauthorizedException('User not found');
    }

    // Check if the user has the admin role
    if (userRecord.role !== 'admin') {
      throw new UnauthorizedException('Insufficient permissions. Admin role required.');
    }

    return true;
  }
}
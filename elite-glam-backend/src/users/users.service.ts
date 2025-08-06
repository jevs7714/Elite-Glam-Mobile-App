import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PasswordService } from './password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UserRecord } from '../firebase/database.types';
import { AdminGuard } from '../auth/guards/admin.guard';

@Injectable()
export class UsersService {
  constructor(
    private firebaseService: FirebaseService,
    private passwordService: PasswordService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserRecord> {
    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(
      createUserDto.password,
    );

    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.message);
    }

    // Validate password confirmation
    if (createUserDto.password !== createUserDto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      const userRecord = await this.firebaseService.createUserRecord({
        username: createUserDto.username,
        email: createUserDto.email,
        password: createUserDto.password,
        role: createUserDto.role,
      });

      return userRecord;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await this.firebaseService.getUserByUid(userId);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new NotFoundException('User not found');
    }
  }

  async getUserByUsername(username: string) {
    try {
      const usersRef = await this.firebaseService.getCollection('users');
      const snapshot = await usersRef
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('User not found');
      }

      const userDoc = snapshot.docs[0];
      return {
        uid: userDoc.id,
        ...userDoc.data(),
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('User not found');
    }
  }

  async login(loginUserDto: LoginUserDto) {
    try {
      const auth = this.firebaseService.getAuth();

      // Verify the email exists
      const userRecord = await auth.getUserByEmail(loginUserDto.email);

      if (!userRecord) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Create a custom token
      const customToken = await auth.createCustomToken(userRecord.uid);

      // Get user data from Firestore
      const userData = await this.firebaseService.getUserByUid(userRecord.uid);

      if (!userData) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return {
        user: {
          uid: userData.uid,
          username: userData.username,
          email: userData.email,
        },
        token: customToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async getAllUsers(): Promise<UserRecord[]> {
    try {
      console.log('Fetching all users');
      const usersRef = await this.firebaseService.getCollection('users');
      const snapshot = await usersRef.get();

      if (snapshot.empty) {
        return [];
      }

      const users = snapshot.docs.map(doc => {
        const data = doc.data() as UserRecord;
        return {
          ...data,
          uid: doc.id,
        };
      });

      console.log(`Found ${users.length} users`);
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async getDashboardStats() {
    try {
      console.log('Fetching dashboard statistics');
      
      // Get user counts by role
      const usersRef = await this.firebaseService.getCollection('users');
      const usersSnapshot = await usersRef.get();
      
      let totalUsers = 0;
      let adminCount = 0;
      let customerCount = 0;
      let shopOwnerCount = 0;
      
      usersSnapshot.forEach(doc => {
        totalUsers++;
        const userData = doc.data();
        switch(userData.role) {
          case 'admin':
            adminCount++;
            break;
          case 'customer':
            customerCount++;
            break;
          case 'shop_owner':
            shopOwnerCount++;
            break;
        }
      });
      
      // Get product count
      const productsRef = await this.firebaseService.getCollection('products');
      const productsSnapshot = await productsRef.get();
      const productCount = productsSnapshot.size;
      
      // Get booking count
      const bookingsRef = await this.firebaseService.getCollection('bookings');
      const bookingsSnapshot = await bookingsRef.get();
      const bookingCount = bookingsSnapshot.size;
      
      // Get pending bookings count
      const pendingBookingsSnapshot = await bookingsRef.where('status', '==', 'pending').get();
      const pendingBookingCount = pendingBookingsSnapshot.size;
      
      return {
        users: {
          total: totalUsers,
          adminCount,
          customerCount,
          shopOwnerCount
        },
        products: {
          total: productCount
        },
        bookings: {
          total: bookingCount,
          pending: pendingBookingCount
        }
      };
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      throw new BadRequestException('Failed to fetch dashboard statistics');
    }
  }
}

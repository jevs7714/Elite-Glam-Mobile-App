import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('GMAIL_USER'),
      to: email,
      subject: 'Elite Glam - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7E57C2; margin: 0;">Elite Glam</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              We received a request to reset your password. Use the verification code below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #7E57C2; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                ${code}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated message from Elite Glam. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

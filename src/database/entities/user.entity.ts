import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
} from 'typeorm';
  
@Entity('users')
export class User {
@PrimaryGeneratedColumn('uuid', { name: 'id' })
id: string;

@Column({ unique: true })
email: string;

@Column()
name: string;

@Column({ nullable: true })
password: string;

@Column({ nullable: true, name: 'google_id' })
googleId: string;

@Column({ nullable: true, name: 'refresh_token' })
refreshToken: string;

@Column({ nullable: true, name: 'gmail_access_token', type: 'text' })
gmailAccessToken: string;

@Column({ nullable: true, name: 'gmail_refresh_token', type: 'text' })
gmailRefreshToken: string;

@Column({ nullable: true, name: 'gmail_token_expiry', type: 'timestamptz' })
gmailTokenExpiry: Date;

@Column({ default: 'user' })
role: string;

@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
createdAt: Date;

@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
updatedAt: Date;
}
  
import { User, UserRole } from '../../src/users/entities/user.entity';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';

export const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  password: '$2b$12$hashedpassword',
  role: UserRole.ADMIN,
  isActive: true,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockCreateUserDto: CreateUserDto = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'password123',
  role: UserRole.STUDENT,
};

export const mockUsers: User[] = [
  mockUser,
  {
    ...mockUser,
    id: '550e8400-e29b-41d4-a716-446655440001',
    firstName: 'Teacher',
    lastName: 'Smith',
    email: 'teacher@example.com',
    role: UserRole.TEACHER,
  },
];

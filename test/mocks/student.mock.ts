import { Student } from '../../src/students/entities/student.entity';
import { CreateStudentDto } from '../../src/students/dto/create-student.dto';

export const mockStudent: Student = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  dateOfBirth: new Date('2000-01-15'),
  grade: '10th Grade',
  enrollmentDate: new Date('2024-01-15'),
  isActive: true,
  phone: '+1234567890',
  address: '123 Main St, City, State',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockCreateStudentDto: CreateStudentDto = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  dateOfBirth: '2000-01-15',
  grade: '10th Grade',
  phone: '+1234567890',
  address: '123 Main St, City, State',
};

export const mockStudents: Student[] = [
  mockStudent,
  {
    ...mockStudent,
    id: '550e8400-e29b-41d4-a716-446655440001',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
  },
];

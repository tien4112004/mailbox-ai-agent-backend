import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from '../../../src/students/students.controller';
import { StudentsService } from '../../../src/students/students.service';
import { JwtAuthGuard } from '../../../src/common/guards/auth.guard';
import { mockStudent, mockCreateStudentDto } from '../../mocks/student.mock';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: StudentsService;

  const mockStudentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
    seedMockData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: mockStudentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StudentsController>(StudentsController);
    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a student', async () => {
      const expectedResult = { ...mockStudent };
      mockStudentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockCreateStudentDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateStudentDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated students', async () => {
      const queryDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [mockStudent],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockStudentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a student by id', async () => {
      const id = 'test-id';
      mockStudentsService.findOne.mockResolvedValue(mockStudent);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockStudent);
    });
  });
});

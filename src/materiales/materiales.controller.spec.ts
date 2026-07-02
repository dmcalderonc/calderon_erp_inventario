import { Test, TestingModule } from '@nestjs/testing';
import { MaterialesController } from './materiales.controller';
import { MaterialesService } from './materiales.service';

describe('MaterialesController', () => {
  let controller: MaterialesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialesController],
      providers: [MaterialesService],
    }).compile();

    controller = module.get<MaterialesController>(MaterialesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

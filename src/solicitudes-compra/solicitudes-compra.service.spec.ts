import { Test, TestingModule } from '@nestjs/testing';
import { SolicitudesCompraService } from './solicitudes-compra.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  SolicitudCompra,
  EstadoSolicitud,
} from './entities/solicitud-compra.entity';
import {
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('SolicitudesCompraService', () => {
  let service: SolicitudesCompraService;

  const mockSolicitudRepository = {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesCompraService,
        {
          provide: getRepositoryToken(SolicitudCompra),
          useValue: mockSolicitudRepository,
        },
      ],
    }).compile();

    service = module.get<SolicitudesCompraService>(SolicitudesCompraService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar todas las solicitudes sin filtros', async () => {
      const data = [{ id: 1, estado: EstadoSolicitud.PENDIENTE }];
      mockSolicitudRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getMany.mockResolvedValue(data);

      const resultado = await service.findAll();

      expect(resultado).toEqual(data);
      expect(mockSolicitudRepository.createQueryBuilder).toHaveBeenCalledWith(
        'solicitud',
      );
    });

    it('debe filtrar por estado', async () => {
      const data = [{ id: 1, estado: EstadoSolicitud.APROBADA }];
      mockSolicitudRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getMany.mockResolvedValue(data);

      const resultado = await service.findAll(EstadoSolicitud.APROBADA);

      expect(resultado).toEqual(data);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'solicitud.estado = :estado',
        { estado: EstadoSolicitud.APROBADA },
      );
    });

    it('debe filtrar por proyectoId', async () => {
      mockSolicitudRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(undefined, 'uuid-proyecto');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'solicitud.proyectoId = :proyectoId',
        { proyectoId: 'uuid-proyecto' },
      );
    });
  });

  describe('update', () => {
    const updateDto = { estado: EstadoSolicitud.APROBADA };

    it('debe actualizar una solicitud exitosamente para ADMIN', async () => {
      const existente = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        usuarioSolicitanteId: 'otro-usuario',
      };
      mockSolicitudRepository.findOneBy.mockResolvedValue(existente);
      mockSolicitudRepository.save.mockResolvedValue({ id: 1, ...updateDto });

      const resultado = await service.update(
        1,
        updateDto,
        'admin-user',
        'ADMIN',
      );

      expect(resultado).toBeDefined();
      expect(mockSolicitudRepository.merge).toHaveBeenCalledWith(
        existente,
        updateDto,
      );
    });

    it('debe actualizar una solicitud exitosamente para SOLICITANTE (propia + estado válido)', async () => {
      const existente = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        usuarioSolicitanteId: 'solicitante-user',
      };
      mockSolicitudRepository.findOneBy.mockResolvedValue(existente);
      mockSolicitudRepository.save.mockResolvedValue({ id: 1, ...updateDto });

      const resultado = await service.update(
        1,
        updateDto,
        'solicitante-user',
        'SOLICITANTE',
      );

      expect(resultado).toBeDefined();
    });

    it('debe lanzar ForbiddenException si SOLICITANTE edita una solicitud en estado COTIZANDO', async () => {
      const existente = {
        id: 1,
        estado: EstadoSolicitud.COTIZANDO,
        usuarioSolicitanteId: 'solicitante-user',
      };
      mockSolicitudRepository.findOneBy.mockResolvedValue(existente);

      await expect(
        service.update(1, updateDto, 'solicitante-user', 'SOLICITANTE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si SOLICITANTE edita una solicitud de otro usuario', async () => {
      const existente = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        usuarioSolicitanteId: 'otro-user',
      };
      mockSolicitudRepository.findOneBy.mockResolvedValue(existente);

      await expect(
        service.update(1, updateDto, 'solicitante-user', 'SOLICITANTE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      mockSolicitudRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(99, updateDto, 'user', 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar InternalServerErrorException si falla el guardado', async () => {
      const existente = {
        id: 1,
        estado: EstadoSolicitud.PENDIENTE,
        usuarioSolicitanteId: 'user',
      };
      mockSolicitudRepository.findOneBy.mockResolvedValue(existente);
      mockSolicitudRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.update(1, updateDto, 'user', 'ADMIN'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});

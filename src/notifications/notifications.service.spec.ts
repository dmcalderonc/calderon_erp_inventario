import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const findOneAndUpdate = jest.fn();
  const countDocuments = jest.fn();
  const exists = jest.fn();

  const execResolved = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: { findOneAndUpdate, countDocuments, exists },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('markAsRead', () => {
    it('restringe el marcado a las notificaciones propias o dirigidas al rol', async () => {
      findOneAndUpdate.mockReturnValue(execResolved({ _id: 'n1', leida: true }));

      await service.markAsRead('n1', 'BODEGUERO', 'user-1');

      expect(findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'n1', $or: [{ usuarioId: 'user-1' }, { rolDestino: 'BODEGUERO' }] },
        { leida: true },
      );
    });

    it('lanza NotFound si la notificación no es visible para el usuario (anti-IDOR)', async () => {
      findOneAndUpdate.mockReturnValue(execResolved(null));

      await expect(service.markAsRead('n1', 'SOLICITANTE', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('countUnread', () => {
    it('solo cuenta las propias o las del rol', async () => {
      countDocuments.mockReturnValue(execResolved(3));

      const count = await service.countUnread('ADMIN', 'user-9');

      expect(count).toBe(3);
      expect(countDocuments).toHaveBeenCalledWith({
        leida: false,
        $or: [{ usuarioId: 'user-9' }, { rolDestino: 'ADMIN' }],
      });
    });
  });

  describe('existeNoLeidaReciente (anti-spam de 24 h)', () => {
    it('consulta por tipo, entidad y antigüedad', async () => {
      exists.mockReturnValue(execResolved({ _id: 'n1' }));

      const resultado = await service.existeNoLeidaReciente('STOCK_QUIEBRE', '17');

      expect(resultado).toBe(true);
      const filtro = exists.mock.calls[0][0];
      expect(filtro).toMatchObject({ tipo: 'STOCK_QUIEBRE', entidadId: '17', leida: false });
      expect(filtro.createdAt.$gte).toBeInstanceOf(Date);
      // Ventana de 24 h: la fecha límite está ~24 h por detrás de "ahora".
      const horas = (Date.now() - filtro.createdAt.$gte.getTime()) / 3600000;
      expect(horas).toBeCloseTo(24, 0);
    });

    it('devuelve false cuando no hay duplicado reciente', async () => {
      exists.mockReturnValue(execResolved(null));

      await expect(service.existeNoLeidaReciente('STOCK_AGOTADO', '2', 12)).resolves.toBe(false);
      expect(exists.mock.calls[0][0].createdAt.$gte.getTime()).toBeCloseTo(Date.now() - 12 * 3600000, -4);
    });
  });
});

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '¡Hola! La API está funcionando correctamente por fingit.';
  }
}
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { concatMap } from 'rxjs';
import type { AuthUser } from '../common/types';
import { recordActivity } from './record-activity';

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const route = request.route?.path;
    if (!writeMethods.has(request.method) || typeof route !== 'string') return next.handle();

    return next.handle().pipe(concatMap(async (result) => {
      const actor = request.user ?? (route === '/auth/login' ? result?.user : undefined);
      if (!actor) return result;
      if (route === '/trackers/:id/submit-drafts' && request.body?.dryRun === true) return result;

      const resource = route.replace(/:(\w+)/g, (placeholder, key: string) => {
        const value = request.params[key];
        return typeof value === 'string' && (uuid.test(value) || (key === 'code' && /^[a-z_.]+$/.test(value)))
          ? value
          : placeholder;
      });
      const createdId = request.method === 'POST' && route !== '/auth/login' &&
        typeof result?.id === 'string' && uuid.test(result.id) ? result.id : undefined;
      await recordActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: context.getHandler().name,
        method: request.method,
        resource: (createdId ? `${resource}/${createdId}` : resource).slice(0, 255),
      });
      return result;
    }));
  }
}

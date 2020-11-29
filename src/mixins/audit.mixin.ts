import {MixinTarget} from '@loopback/core';
import {
  Count,
  DataObject,
  Entity,
  EntityCrudRepository,
  Options,
  Where,
} from '@loopback/repository';
import {keyBy} from 'lodash';

import {Action, AuditLog} from '../models';
import {AuditLogRepository} from '../repositories';
import {IAuditMixin, IAuditMixinOptions} from '../types';

export function AuditRepositoryMixin<
  M extends Entity,
  ID,
  Relations extends object,
  UserID,
  R extends MixinTarget<EntityCrudRepository<M, ID, Relations>>
>(superClass: R, opts: IAuditMixinOptions) {
  class MixedRepository extends superClass implements IAuditMixin<UserID> {
    getAuditLogRepository: () => Promise<AuditLogRepository>;
    getCurrentUser?: () => Promise<{id?: UserID}>;

    // @ts-ignore
    async create(dataObject: DataObject<M>, options?: Options): Promise<M> {
      const created = await super.create(dataObject, options);
      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const audit = new AuditLog({
          actedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actor: (user?.id as any).toString() ?? '0',
          action: Action.INSERT_ONE,
          after: created.toJSON(),
          entityId: created.getId(),
          actedOn: this.entityClass.modelName,
          actionKey: opts.actionKey,
        });
        auditRepo.create(audit).catch(() => {
          console.error(
            `Audit failed for data => ${JSON.stringify(audit.toJSON())}`,
          );
        });
      }
      return created;
    }

    // @ts-ignore
    async createAll(
      dataObjects: DataObject<M>[],
      options?: Options,
    ): Promise<M[]> {
      const created = await super.createAll(dataObjects, options);
      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const audits = created.map(
          data =>
            new AuditLog({
              actedAt: new Date(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actor: (user?.id as any).toString() ?? '0',
              action: Action.INSERT_MANY,
              after: data.toJSON(),
              entityId: data.getId(),
              actedOn: this.entityClass.modelName,
              actionKey: opts.actionKey,
            }),
        );
        auditRepo.createAll(audits).catch(() => {
          const auditsJson = audits.map(a => a.toJSON());
          console.error(
            `Audit failed for data => ${JSON.stringify(auditsJson)}`,
          );
        });
      }
      return created;
    }

    // @ts-ignore
    async updateAll(
      dataObject: DataObject<M>,
      where?: Where<M>,
      options?: Options,
    ): Promise<Count> {
      const toUpdate = await this.find({where});
      const beforeMap = keyBy(toUpdate, d => d.getId());
      const updatedCount = await super.updateAll(dataObject, where, options);
      const updated = await this.find({where});

      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const audits = updated.map(
          data =>
            new AuditLog({
              actedAt: new Date(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actor: (user?.id as any).toString() ?? '0',
              action: Action.UPDATE_MANY,
              before: (beforeMap[data.getId()] as Entity).toJSON(),
              after: data.toJSON(),
              entityId: data.getId(),
              actedOn: this.entityClass.modelName,
              actionKey: opts.actionKey,
            }),
        );
        auditRepo.createAll(audits).catch(() => {
          const auditsJson = audits.map(a => a.toJSON());
          console.error(
            `Audit failed for data => ${JSON.stringify(auditsJson)}`,
          );
        });
      }

      return updatedCount;
    }

    // @ts-ignore
    async deleteAll(where?: Where<M>, options?: Options): Promise<Count> {
      const toDelete = await this.find({where});
      const beforeMap = keyBy(toDelete, d => d.getId());
      const deletedCount = await super.deleteAll(where, options);

      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const audits = toDelete.map(
          data =>
            new AuditLog({
              actedAt: new Date(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actor: (user?.id as any).toString() ?? '0',
              action: Action.DELETE_MANY,
              before: (beforeMap[data.getId()] as Entity).toJSON(),
              entityId: data.getId(),
              actedOn: this.entityClass.modelName,
              actionKey: opts.actionKey,
            }),
        );
        auditRepo.createAll(audits).catch(() => {
          const auditsJson = audits.map(a => a.toJSON());
          console.error(
            `Audit failed for data => ${JSON.stringify(auditsJson)}`,
          );
        });
      }

      return deletedCount;
    }

    // @ts-ignore
    async updateById(
      id: ID,
      data: DataObject<M>,
      options?: Options,
    ): Promise<void> {
      const before = await this.findById(id);
      await super.updateById(id, data, options);
      const after = await this.findById(id);

      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const auditLog = new AuditLog({
          actedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actor: (user?.id as any).toString() ?? '0',
          action: Action.UPDATE_ONE,
          before: before.toJSON(),
          after: after.toJSON(),
          entityId: before.getId(),
          actedOn: this.entityClass.modelName,
          actionKey: opts.actionKey,
        });

        auditRepo.create(auditLog).catch(() => {
          console.error(
            `Audit failed for data => ${JSON.stringify(auditLog.toJSON())}`,
          );
        });
      }
    }

    // @ts-ignore
    async replaceById(
      id: ID,
      data: DataObject<M>,
      options?: Options,
    ): Promise<void> {
      const before = await this.findById(id);
      await super.replaceById(id, data, options);
      const after = await this.findById(id);

      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const auditLog = new AuditLog({
          actedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actor: (user?.id as any).toString() ?? '0',
          action: Action.UPDATE_ONE,
          before: before.toJSON(),
          after: after.toJSON(),
          entityId: before.getId(),
          actedOn: this.entityClass.modelName,
          actionKey: opts.actionKey,
        });

        auditRepo.create(auditLog).catch(() => {
          console.error(
            `Audit failed for data => ${JSON.stringify(auditLog.toJSON())}`,
          );
        });
      }
    }

    // @ts-ignore
    async deleteById(id: ID, options?: Options): Promise<void> {
      const before = await this.findById(id);
      await super.deleteById(id, options);

      if (this.getCurrentUser) {
        const user = await this.getCurrentUser();
        const auditRepo = await this.getAuditLogRepository();
        const auditLog = new AuditLog({
          actedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          actor: (user?.id as any).toString() ?? '0',
          action: Action.DELETE_ONE,
          before: before.toJSON(),
          entityId: before.getId(),
          actedOn: this.entityClass.modelName,
          actionKey: opts.actionKey,
        });

        auditRepo.create(auditLog).catch(() => {
          console.error(
            `Audit failed for data => ${JSON.stringify(auditLog.toJSON())}`,
          );
        });
      }
    }
  }
  return MixedRepository;
}
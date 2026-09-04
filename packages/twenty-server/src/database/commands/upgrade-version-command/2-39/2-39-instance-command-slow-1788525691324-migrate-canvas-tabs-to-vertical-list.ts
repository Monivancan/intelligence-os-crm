import { Logger } from '@nestjs/common';

import { DataSource, QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';

type AmbiguousCanvasTabCount = {
  ambiguousTabCount: string;
};

@RegisteredInstanceCommand('2.39.0', 1788525691324, { type: 'slow' })
export class MigrateCanvasTabsToVerticalListSlowInstanceCommand
  implements SlowInstanceCommand
{
  private readonly logger = new Logger(
    MigrateCanvasTabsToVerticalListSlowInstanceCommand.name,
  );

  public async runDataMigration(dataSource: DataSource): Promise<void> {
    const [ambiguousCanvasTabCount] = (await dataSource.query(`
      SELECT COUNT(*)::text AS "ambiguousTabCount"
      FROM (
        SELECT tab."id"
        FROM "core"."pageLayoutTab" tab
        LEFT JOIN "core"."pageLayoutWidget" widget
          ON widget."pageLayoutTabId" = tab."id"
        WHERE tab."layoutMode" = 'CANVAS'
          AND tab."deletedAt" IS NULL
        GROUP BY tab."id"
        HAVING COUNT(widget."id") FILTER (
          WHERE widget."deletedAt" IS NULL
        ) <> 1
          OR COUNT(widget."id") FILTER (
            WHERE widget."deletedAt" IS NULL
              AND widget."isActive" = true
          ) <> 1
      ) ambiguous_tabs
    `)) as AmbiguousCanvasTabCount[];

    if (Number(ambiguousCanvasTabCount?.ambiguousTabCount ?? 0) > 0) {
      this.logger.warn(
        `Leaving ${ambiguousCanvasTabCount.ambiguousTabCount} empty, inactive, or multi-widget Canvas tab(s) unchanged`,
      );
    }

    await dataSource.query(`
      WITH eligible_tabs AS MATERIALIZED (
        SELECT tab."id"
        FROM "core"."pageLayoutTab" tab
        JOIN "core"."pageLayoutWidget" widget
          ON widget."pageLayoutTabId" = tab."id"
        WHERE tab."layoutMode" = 'CANVAS'
          AND tab."deletedAt" IS NULL
        GROUP BY tab."id"
        HAVING COUNT(widget."id") FILTER (
          WHERE widget."deletedAt" IS NULL
        ) = 1
          AND COUNT(widget."id") FILTER (
            WHERE widget."deletedAt" IS NULL
              AND widget."isActive" = true
          ) = 1
      ), migrated_widgets AS (
        UPDATE "core"."pageLayoutWidget" widget
        SET "position" = jsonb_build_object(
          'layoutMode', 'VERTICAL_LIST',
          'index', 0,
          'heightBehavior', 'TAB_VIEWPORT'
        )
        FROM eligible_tabs
        WHERE widget."pageLayoutTabId" = eligible_tabs."id"
          AND widget."deletedAt" IS NULL
        RETURNING widget."pageLayoutTabId"
      )
      UPDATE "core"."pageLayoutTab" tab
      SET "layoutMode" = 'VERTICAL_LIST'
      FROM eligible_tabs
      WHERE tab."id" = eligible_tabs."id"
    `);
  }

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH eligible_tabs AS MATERIALIZED (
        SELECT tab."id"
        FROM "core"."pageLayoutTab" tab
        JOIN "core"."pageLayoutWidget" widget
          ON widget."pageLayoutTabId" = tab."id"
        WHERE tab."layoutMode" = 'VERTICAL_LIST'
          AND tab."deletedAt" IS NULL
        GROUP BY tab."id"
        HAVING COUNT(widget."id") FILTER (
          WHERE widget."deletedAt" IS NULL
        ) = 1
          AND COUNT(widget."id") FILTER (
            WHERE widget."deletedAt" IS NULL
              AND widget."isActive" = true
              AND widget."position"->>'layoutMode' = 'VERTICAL_LIST'
              AND widget."position"->>'heightBehavior' = 'TAB_VIEWPORT'
          ) = 1
      ), migrated_widgets AS (
        UPDATE "core"."pageLayoutWidget" widget
        SET "position" = jsonb_build_object('layoutMode', 'CANVAS')
        FROM eligible_tabs
        WHERE widget."pageLayoutTabId" = eligible_tabs."id"
          AND widget."deletedAt" IS NULL
        RETURNING widget."pageLayoutTabId"
      )
      UPDATE "core"."pageLayoutTab" tab
      SET "layoutMode" = 'CANVAS'
      FROM eligible_tabs
      WHERE tab."id" = eligible_tabs."id"
    `);
  }
}

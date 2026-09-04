import { type DataSource, type QueryRunner } from 'typeorm';

import { MigrateCanvasTabsToVerticalListSlowInstanceCommand } from 'src/database/commands/upgrade-version-command/2-39/2-39-instance-command-slow-1788525691324-migrate-canvas-tabs-to-vertical-list';

describe('MigrateCanvasTabsToVerticalListSlowInstanceCommand', () => {
  const command = new MigrateCanvasTabsToVerticalListSlowInstanceCommand();

  it('migrates only unambiguous single-widget Canvas tabs', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ ambiguousTabCount: '2' }])
      .mockResolvedValueOnce([]);

    await command.runDataMigration({ query } as unknown as DataSource);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain(
      `COUNT(widget."id") FILTER (
          WHERE widget."deletedAt" IS NULL
        ) = 1`,
    );
    expect(query.mock.calls[1][0]).toContain(
      `'heightBehavior', 'TAB_VIEWPORT'`,
    );
    expect(query.mock.calls[1][0]).toContain(
      `SET "layoutMode" = 'VERTICAL_LIST'`,
    );
  });

  it('restores compatible Canvas data on downgrade', async () => {
    const query = jest.fn().mockResolvedValue([]);

    await command.down({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      `widget."position"->>'heightBehavior' = 'TAB_VIEWPORT'`,
    );
    expect(query.mock.calls[0][0]).toContain(
      `jsonb_build_object('layoutMode', 'CANVAS')`,
    );
    expect(query.mock.calls[0][0]).toContain(`SET "layoutMode" = 'CANVAS'`);
  });
});

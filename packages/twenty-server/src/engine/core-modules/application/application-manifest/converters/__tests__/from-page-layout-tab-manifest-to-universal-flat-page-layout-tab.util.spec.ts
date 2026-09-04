import { PageLayoutTabLayoutMode, PageLayoutType } from 'twenty-shared/types';

import { fromPageLayoutTabManifestToUniversalFlatPageLayoutTab } from 'src/engine/core-modules/application/application-manifest/converters/from-page-layout-tab-manifest-to-universal-flat-page-layout-tab.util';

describe('fromPageLayoutTabManifestToUniversalFlatPageLayoutTab', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const applicationUniversalIdentifier = 'app-uuid-1';
  const pageLayoutUniversalIdentifier = 'pl-uuid-1';

  it('should convert a minimal page layout tab manifest', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-1',
        title: 'Overview',
        position: 0,
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: undefined,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.universalIdentifier).toBe('tab-uuid-1');
    expect(result.applicationUniversalIdentifier).toBe(
      applicationUniversalIdentifier,
    );
    expect(result.title).toBe('Overview');
    expect(result.position).toBe(0);
    expect(result.pageLayoutUniversalIdentifier).toBe(
      pageLayoutUniversalIdentifier,
    );
    expect(result.icon).toBeNull();
    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.GRID);
    expect(result.widgetUniversalIdentifiers).toEqual([]);
  });

  it('should convert a fully specified page layout tab manifest', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-2',
        title: 'Details',
        position: 1,
        icon: 'IconLayout',
        layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: undefined,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.title).toBe('Details');
    expect(result.position).toBe(1);
    expect(result.icon).toBe('IconLayout');
    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.VERTICAL_LIST);
  });

  it('should default a standalone page tab to VERTICAL_LIST', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-3',
        title: 'Overview',
        position: 0,
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: PageLayoutType.STANDALONE_PAGE,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.VERTICAL_LIST);
  });

  it('should default a dashboard tab to GRID', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-4',
        title: 'Overview',
        position: 0,
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: PageLayoutType.DASHBOARD,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.GRID);
  });

  it('should keep an explicit layoutMode on a standalone page tab', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-5',
        title: 'Overview',
        position: 0,
        layoutMode: PageLayoutTabLayoutMode.GRID,
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: PageLayoutType.STANDALONE_PAGE,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.GRID);
  });

  it('should normalize a single-widget legacy Canvas tab to VERTICAL_LIST', () => {
    const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
      pageLayoutTabManifest: {
        universalIdentifier: 'tab-uuid-6',
        title: 'App',
        position: 0,
        layoutMode: PageLayoutTabLayoutMode.CANVAS,
        widgets: [
          {
            universalIdentifier: 'widget-uuid-1',
            title: 'App',
            type: 'FRONT_COMPONENT',
            configuration: {
              configurationType: 'FRONT_COMPONENT',
              frontComponentUniversalIdentifier: 'front-component-uuid-1',
            },
          },
        ],
      },
      pageLayoutUniversalIdentifier,
      pageLayoutType: PageLayoutType.RECORD_PAGE,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.VERTICAL_LIST);
  });

  it.each([0, 2])(
    'should leave a legacy Canvas tab with %i widgets unchanged',
    (widgetCount) => {
      const result = fromPageLayoutTabManifestToUniversalFlatPageLayoutTab({
        pageLayoutTabManifest: {
          universalIdentifier: 'tab-uuid-7',
          title: 'Ambiguous Canvas',
          position: 0,
          layoutMode: PageLayoutTabLayoutMode.CANVAS,
          widgets: Array.from({ length: widgetCount }, (_, index) => ({
            universalIdentifier: `widget-uuid-${index}`,
            title: `Widget ${index}`,
            type: 'VIEW' as const,
            configuration: { configurationType: 'VIEW' as const },
          })),
        },
        pageLayoutUniversalIdentifier,
        pageLayoutType: PageLayoutType.RECORD_PAGE,
        applicationUniversalIdentifier,
        now,
      });

      expect(result.layoutMode).toBe(PageLayoutTabLayoutMode.CANVAS);
    },
  );
});

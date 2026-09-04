import { type PageLayoutWidgetManifest } from 'twenty-shared/application';
import { DEFAULT_WIDGET_SIZE } from 'twenty-shared/constants';
import {
  type GridPosition,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from 'twenty-shared/types';

import { fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget } from 'src/engine/core-modules/application/application-manifest/converters/from-page-layout-widget-manifest-to-universal-flat-page-layout-widget.util';
import { ApplicationException } from 'src/engine/core-modules/application/application.exception';

describe('fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget', () => {
  const now = '2026-01-01T00:00:00.000Z';
  const applicationUniversalIdentifier = 'app-uuid-1';
  const pageLayoutTabUniversalIdentifier = 'tab-uuid-1';

  it('should convert a minimal page layout widget manifest', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-1',
        title: 'My Widget',
        type: WidgetType.VIEW,
        configuration: { configurationType: 'VIEW' },
      },
      pageLayoutTabUniversalIdentifier,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.universalIdentifier).toBe('widget-uuid-1');
    expect(result.applicationUniversalIdentifier).toBe(
      applicationUniversalIdentifier,
    );
    expect(result.pageLayoutTabUniversalIdentifier).toBe(
      pageLayoutTabUniversalIdentifier,
    );
    expect(result.title).toBe('My Widget');
    expect(result.type).toBe(WidgetType.VIEW);
    expect(result.objectMetadataUniversalIdentifier).toBeNull();
    expect(result.conditionalDisplay).toBeNull();
    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.GRID,
      row: 0,
      column: 0,
      rowSpan: DEFAULT_WIDGET_SIZE.default.h,
      columnSpan: DEFAULT_WIDGET_SIZE.default.w,
    });
    expect(result.universalConfiguration).toEqual({
      configurationType: 'VIEW',
    });
  });

  it('should convert a fully specified page layout widget manifest', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-2',
        title: 'Iframe Widget',
        type: 'IFRAME',
        objectUniversalIdentifier: 'obj-uuid-1',
        configuration: {
          configurationType: 'IFRAME',
          url: 'https://example.com',
        },
      },
      pageLayoutTabUniversalIdentifier,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.title).toBe('Iframe Widget');
    expect(result.type).toBe('IFRAME');
    expect(result.objectMetadataUniversalIdentifier).toBe('obj-uuid-1');
    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.GRID,
      row: 0,
      column: 0,
      rowSpan: DEFAULT_WIDGET_SIZE.default.h,
      columnSpan: DEFAULT_WIDGET_SIZE.default.w,
    });
    expect(result.universalConfiguration).toEqual({
      configurationType: 'IFRAME',
      url: 'https://example.com',
    });
  });

  it('should use manifest position when provided', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-3',
        title: 'Positioned Widget',
        type: WidgetType.GRAPH,
        position: {
          layoutMode: PageLayoutTabLayoutMode.GRID,
          row: 2,
          column: 6,
          rowSpan: 4,
          columnSpan: 6,
        },
        configuration: { configurationType: 'VIEW' },
      },
      pageLayoutTabUniversalIdentifier,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.GRID,
      row: 2,
      column: 6,
      rowSpan: 4,
      columnSpan: 6,
    });
  });

  it('should use legacy manifest grid position when provided', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-legacy',
        title: 'Legacy Positioned Widget',
        type: WidgetType.GRAPH,
        gridPosition: {
          row: 2,
          column: 6,
          rowSpan: 4,
          columnSpan: 6,
        },
        configuration: { configurationType: 'VIEW' },
      } as PageLayoutWidgetManifest & { gridPosition: GridPosition },
      pageLayoutTabUniversalIdentifier,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.GRID,
      row: 2,
      column: 6,
      rowSpan: 4,
      columnSpan: 6,
    });
  });

  it('should derive a vertical-list widget index from its array order', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-4',
        title: 'Widget',
        type: WidgetType.VIEW,
        configuration: { configurationType: 'VIEW' },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgetIndex: 2,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: 2,
    });
  });

  it('should default a Canvas widget to a Canvas position', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-canvas-without-position',
        title: 'Canvas Widget',
        type: WidgetType.VIEW,
        configuration: { configurationType: 'VIEW' },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.CANVAS,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
    });
  });

  it('should omit vertical-list heightBehavior when it is not supplied', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-without-height-behavior',
        title: 'Fit Content Widget',
        type: WidgetType.VIEW,
        configuration: { configurationType: 'VIEW' },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).not.toHaveProperty('heightBehavior');
  });

  it('should propagate a top-level vertical-list height behavior', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-5',
        title: 'Viewport Widget',
        type: WidgetType.FRONT_COMPONENT,
        heightBehavior: 'TAB_VIEWPORT',
        configuration: {
          configurationType: 'FRONT_COMPONENT',
          frontComponentUniversalIdentifier: 'front-component-uuid-1',
        },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgetIndex: 1,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: 1,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
    });
  });

  it('should preserve a legacy explicit vertical-list height behavior while deriving layout mode and index', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-6',
        title: 'Legacy Positioned Widget',
        type: WidgetType.FRONT_COMPONENT,
        position: {
          layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
          index: 99,
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
        },
        configuration: {
          configurationType: 'FRONT_COMPONENT',
          frontComponentUniversalIdentifier: 'front-component-uuid-1',
        },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgetIndex: 1,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: 1,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
    });
  });

  it('should prefer top-level heightBehavior over the legacy nested value', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-7',
        title: 'Migrating Widget',
        type: WidgetType.FRONT_COMPONENT,
        heightBehavior: 'FIT_CONTENT',
        position: {
          layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
          index: 0,
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
        },
        configuration: {
          configurationType: 'FRONT_COMPONENT',
          frontComponentUniversalIdentifier: 'front-component-uuid-1',
        },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: 0,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
    });
  });

  it.each([
    {
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.GRID,
      pageLayoutTabManifestLayoutMode: PageLayoutTabLayoutMode.GRID,
      manifestLayoutMode: PageLayoutTabLayoutMode.GRID,
    },
    {
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.CANVAS,
      pageLayoutTabManifestLayoutMode: PageLayoutTabLayoutMode.CANVAS,
      manifestLayoutMode: PageLayoutTabLayoutMode.CANVAS,
    },
    {
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      pageLayoutTabManifestLayoutMode: PageLayoutTabLayoutMode.CANVAS,
      manifestLayoutMode: PageLayoutTabLayoutMode.CANVAS,
    },
  ])(
    'should reject top-level heightBehavior on a $manifestLayoutMode tab',
    ({
      pageLayoutTabLayoutMode,
      pageLayoutTabManifestLayoutMode,
      manifestLayoutMode,
    }) => {
      const convertWidget = () =>
        fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
          pageLayoutWidgetManifest: {
            universalIdentifier: 'widget-uuid-invalid',
            title: 'Invalid Widget',
            type: WidgetType.FRONT_COMPONENT,
            heightBehavior: 'TAB_VIEWPORT',
            configuration: {
              configurationType: 'FRONT_COMPONENT',
              frontComponentUniversalIdentifier: 'front-component-uuid-1',
            },
          },
          pageLayoutTabUniversalIdentifier,
          pageLayoutTabLayoutMode,
          pageLayoutTabManifestLayoutMode,
          applicationUniversalIdentifier,
          now,
        });

      expect(convertWidget).toThrow(ApplicationException);
      expect(convertWidget).toThrow(
        `Page layout widget "Invalid Widget" defines heightBehavior, but its parent tab uses ${manifestLayoutMode}. heightBehavior is only supported for VERTICAL_LIST tabs.`,
      );
    },
  );

  it('should normalize a legacy Canvas widget to TAB_VIEWPORT even when it has an explicit Canvas position', () => {
    const result = fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget({
      pageLayoutWidgetManifest: {
        universalIdentifier: 'widget-uuid-canvas',
        title: 'Legacy App',
        type: WidgetType.FRONT_COMPONENT,
        position: { layoutMode: PageLayoutTabLayoutMode.CANVAS },
        configuration: {
          configurationType: 'FRONT_COMPONENT',
          frontComponentUniversalIdentifier: 'front-component-uuid-1',
        },
      },
      pageLayoutTabUniversalIdentifier,
      pageLayoutTabLayoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      pageLayoutTabManifestLayoutMode: PageLayoutTabLayoutMode.CANVAS,
      applicationUniversalIdentifier,
      now,
    });

    expect(result.position).toEqual({
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: 0,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
    });
  });
});

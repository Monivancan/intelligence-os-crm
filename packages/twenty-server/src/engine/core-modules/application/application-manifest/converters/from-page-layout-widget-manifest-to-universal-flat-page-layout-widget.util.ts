import { type PageLayoutWidgetManifest } from 'twenty-shared/application';
import { DEFAULT_WIDGET_SIZE } from 'twenty-shared/constants';
import {
  type GridPosition,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  type PageLayoutWidgetPosition,
  type WidgetType,
} from 'twenty-shared/types';
import { assertUnreachable, isDefined } from 'twenty-shared/utils';

import { type UniversalFlatPageLayoutWidget } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout-widget.type';

type PageLayoutWidgetManifestWithLegacyGridPosition =
  PageLayoutWidgetManifest & {
    gridPosition?: GridPosition;
  };

const getPageLayoutWidgetPosition = ({
  pageLayoutWidgetManifest,
  pageLayoutTabLayoutMode,
  widgetIndex,
  isLegacyCanvasTab,
}: {
  pageLayoutWidgetManifest: PageLayoutWidgetManifest;
  pageLayoutTabLayoutMode: PageLayoutTabLayoutMode;
  widgetIndex: number;
  isLegacyCanvasTab: boolean;
}): PageLayoutWidgetPosition => {
  if (
    isDefined(pageLayoutWidgetManifest.heightBehavior) &&
    (pageLayoutTabLayoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST ||
      isLegacyCanvasTab)
  ) {
    const manifestLayoutMode = isLegacyCanvasTab
      ? PageLayoutTabLayoutMode.CANVAS
      : pageLayoutTabLayoutMode;

    throw new Error(
      `Page layout widget "${pageLayoutWidgetManifest.title}" defines heightBehavior, but its parent tab uses ${manifestLayoutMode}. heightBehavior is only supported for VERTICAL_LIST tabs.`,
    );
  }

  if (isLegacyCanvasTab) {
    return {
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: widgetIndex,
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
    };
  }

  if (pageLayoutTabLayoutMode === PageLayoutTabLayoutMode.VERTICAL_LIST) {
    const legacyHeightBehavior =
      pageLayoutWidgetManifest.position?.layoutMode ===
      PageLayoutTabLayoutMode.VERTICAL_LIST
        ? pageLayoutWidgetManifest.position.heightBehavior
        : undefined;
    const heightBehavior =
      pageLayoutWidgetManifest.heightBehavior ?? legacyHeightBehavior;

    return {
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index: widgetIndex,
      ...(isDefined(heightBehavior)
        ? {
            heightBehavior:
              heightBehavior as PageLayoutWidgetVerticalListHeightBehavior,
          }
        : {}),
    };
  }

  if (isDefined(pageLayoutWidgetManifest.position)) {
    return pageLayoutWidgetManifest.position;
  }

  const { gridPosition } =
    pageLayoutWidgetManifest as PageLayoutWidgetManifestWithLegacyGridPosition;

  if (isDefined(gridPosition)) {
    return {
      layoutMode: PageLayoutTabLayoutMode.GRID,
      ...gridPosition,
    };
  }

  switch (pageLayoutTabLayoutMode) {
    case PageLayoutTabLayoutMode.GRID:
      return {
        layoutMode: PageLayoutTabLayoutMode.GRID,
        row: 0,
        column: 0,
        rowSpan: DEFAULT_WIDGET_SIZE.default.h,
        columnSpan: DEFAULT_WIDGET_SIZE.default.w,
      };
    case PageLayoutTabLayoutMode.CANVAS:
      return { layoutMode: PageLayoutTabLayoutMode.CANVAS };
    default:
      return assertUnreachable(pageLayoutTabLayoutMode);
  }
};

export const fromPageLayoutWidgetManifestToUniversalFlatPageLayoutWidget = ({
  pageLayoutWidgetManifest,
  pageLayoutTabUniversalIdentifier,
  pageLayoutTabLayoutMode = PageLayoutTabLayoutMode.GRID,
  widgetIndex = 0,
  isLegacyCanvasTab = false,
  applicationUniversalIdentifier,
  now,
}: {
  pageLayoutWidgetManifest: PageLayoutWidgetManifest;
  pageLayoutTabUniversalIdentifier: string;
  pageLayoutTabLayoutMode?: PageLayoutTabLayoutMode;
  widgetIndex?: number;
  isLegacyCanvasTab?: boolean;
  applicationUniversalIdentifier: string;
  now: string;
}): UniversalFlatPageLayoutWidget => {
  return {
    universalIdentifier: pageLayoutWidgetManifest.universalIdentifier,
    applicationUniversalIdentifier,
    pageLayoutTabUniversalIdentifier,
    title: pageLayoutWidgetManifest.title,
    isActive: true,
    isSystemSideEffect: false,
    type: pageLayoutWidgetManifest.type as WidgetType,
    objectMetadataUniversalIdentifier:
      pageLayoutWidgetManifest.objectUniversalIdentifier ?? null,
    conditionalDisplay: pageLayoutWidgetManifest.conditionalDisplay ?? null,
    position: getPageLayoutWidgetPosition({
      pageLayoutWidgetManifest,
      pageLayoutTabLayoutMode,
      widgetIndex,
      isLegacyCanvasTab,
    }),
    universalConfiguration:
      pageLayoutWidgetManifest.configuration as UniversalFlatPageLayoutWidget['universalConfiguration'],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    conditionalAvailabilityExpression: null,
    universalOverrides: null,
  };
};

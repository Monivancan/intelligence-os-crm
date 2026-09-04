import {
  type PageLayoutManifest,
  type PageLayoutTabManifest,
} from 'twenty-shared/application';
import { PageLayoutTabLayoutMode, PageLayoutType } from 'twenty-shared/types';

import { type UniversalFlatPageLayoutTab } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout-tab.type';

export const fromPageLayoutTabManifestToUniversalFlatPageLayoutTab = ({
  pageLayoutTabManifest,
  pageLayoutUniversalIdentifier,
  pageLayoutType,
  applicationUniversalIdentifier,
  now,
}: {
  pageLayoutTabManifest: PageLayoutTabManifest;
  pageLayoutUniversalIdentifier: string;
  pageLayoutType: PageLayoutManifest['type'] | undefined;
  applicationUniversalIdentifier: string;
  now: string;
}): UniversalFlatPageLayoutTab => {
  const shouldNormalizeLegacyCanvasTab =
    pageLayoutTabManifest.layoutMode === PageLayoutTabLayoutMode.CANVAS &&
    pageLayoutTabManifest.widgets?.length === 1;

  return {
    universalIdentifier: pageLayoutTabManifest.universalIdentifier,
    applicationUniversalIdentifier,
    title: pageLayoutTabManifest.title,
    position: pageLayoutTabManifest.position,
    pageLayoutUniversalIdentifier,
    icon: pageLayoutTabManifest.icon ?? null,
    layoutMode: shouldNormalizeLegacyCanvasTab
      ? PageLayoutTabLayoutMode.VERTICAL_LIST
      : (pageLayoutTabManifest.layoutMode ??
        (pageLayoutType === PageLayoutType.STANDALONE_PAGE
          ? PageLayoutTabLayoutMode.VERTICAL_LIST
          : PageLayoutTabLayoutMode.GRID)),
    isActive: true,
    isSystemSideEffect: false,
    widgetUniversalIdentifiers: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    overrides: null,
  };
};

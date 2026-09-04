import {
  type PageLayoutManifest,
  type PageLayoutTabManifest,
  resolvePageLayoutTabManifestLayoutMode,
} from 'twenty-shared/application';

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
  const { normalizedLayoutMode } = resolvePageLayoutTabManifestLayoutMode({
    pageLayoutTabManifest,
    pageLayoutType,
  });

  return {
    universalIdentifier: pageLayoutTabManifest.universalIdentifier,
    applicationUniversalIdentifier,
    title: pageLayoutTabManifest.title,
    position: pageLayoutTabManifest.position,
    pageLayoutUniversalIdentifier,
    icon: pageLayoutTabManifest.icon ?? null,
    layoutMode: normalizedLayoutMode,
    isActive: true,
    isSystemSideEffect: false,
    widgetUniversalIdentifiers: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    overrides: null,
  };
};

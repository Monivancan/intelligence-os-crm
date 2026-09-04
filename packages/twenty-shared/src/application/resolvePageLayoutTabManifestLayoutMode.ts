import {
  type PageLayoutManifest,
  type PageLayoutTabManifest,
} from '@/application/pageLayoutManifestType';
import { PageLayoutTabLayoutMode, PageLayoutType } from '@/types';

export const resolvePageLayoutTabManifestLayoutMode = ({
  pageLayoutTabManifest,
  pageLayoutType,
}: {
  pageLayoutTabManifest: PageLayoutTabManifest;
  pageLayoutType: PageLayoutManifest['type'] | undefined;
}): {
  manifestLayoutMode: PageLayoutTabLayoutMode;
  normalizedLayoutMode: PageLayoutTabLayoutMode;
} => {
  const manifestLayoutMode =
    pageLayoutTabManifest.layoutMode ??
    (pageLayoutType === PageLayoutType.STANDALONE_PAGE
      ? PageLayoutTabLayoutMode.VERTICAL_LIST
      : PageLayoutTabLayoutMode.GRID);

  const shouldNormalizeLegacyCanvasTab =
    manifestLayoutMode === PageLayoutTabLayoutMode.CANVAS &&
    pageLayoutTabManifest.widgets?.length === 1;

  return {
    manifestLayoutMode,
    normalizedLayoutMode: shouldNormalizeLegacyCanvasTab
      ? PageLayoutTabLayoutMode.VERTICAL_LIST
      : manifestLayoutMode,
  };
};

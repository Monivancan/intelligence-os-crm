import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { isVerticalListPosition } from '@/page-layout/utils/isVerticalListPosition';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutWidgetVerticalListHeightBehavior } from '~/generated-metadata/graphql';

export const isTabViewportWidget = (
  widget: Pick<PageLayoutWidget, 'position'>,
): boolean =>
  isDefined(widget.position) &&
  isVerticalListPosition(widget.position) &&
  widget.position.heightBehavior ===
    PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

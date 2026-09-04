import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { isVerticalListPosition } from '@/page-layout/utils/isVerticalListPosition';
import { isViewportFillingWidgetType } from '@/page-layout/widgets/utils/isViewportFillingWidgetType';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutWidgetVerticalListHeightBehavior } from '~/generated-metadata/graphql';

type ViewportFillingWidget = Pick<PageLayoutWidget, 'position' | 'type'>;

export const isViewportFillingWidget = (
  widget: ViewportFillingWidget,
): boolean => {
  if (
    isDefined(widget.position) &&
    isVerticalListPosition(widget.position) &&
    isDefined(widget.position.heightBehavior)
  ) {
    return (
      widget.position.heightBehavior ===
      PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT
    );
  }

  return isViewportFillingWidgetType(widget.type);
};

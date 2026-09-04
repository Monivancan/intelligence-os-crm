import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type WidgetCardVariant } from '@/page-layout/widgets/types/WidgetCardVariant';
import {
  getWidgetContentPadding,
  type WidgetContentPadding,
} from '@/page-layout/widgets/utils/getWidgetContentPadding';
import { isTabViewportWidget } from '@/page-layout/widgets/utils/isViewportFillingWidget';
import { isWidgetCardFlushInViewMode } from '@/page-layout/widgets/utils/isWidgetCardFlushInViewMode';

type GetWidgetCardContentPaddingParams = {
  widget: Pick<PageLayoutWidget, 'position' | 'type'>;
  isEditable: boolean;
  variant: WidgetCardVariant;
};

export const getWidgetCardContentPadding = ({
  widget,
  isEditable,
  variant,
}: GetWidgetCardContentPaddingParams): WidgetContentPadding => {
  if (!isEditable && isTabViewportWidget(widget)) {
    return 'none';
  }

  return isWidgetCardFlushInViewMode({ isEditable, variant })
    ? getWidgetContentPadding(widget.type)
    : 'default';
};

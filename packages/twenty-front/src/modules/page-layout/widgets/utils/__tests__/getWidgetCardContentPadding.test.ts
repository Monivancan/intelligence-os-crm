import { makeWidget } from '@/page-layout/testing/pageLayoutDraftFixtures';
import { getWidgetCardContentPadding } from '@/page-layout/widgets/utils/getWidgetCardContentPadding';
import {
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '~/generated-metadata/graphql';

const tabViewportWidget = {
  ...makeWidget('front-component', 0),
  type: WidgetType.FRONT_COMPONENT,
  position: {
    __typename: 'PageLayoutWidgetVerticalListPosition' as const,
    layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
    index: 0,
    heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
  },
};

describe('getWidgetCardContentPadding', () => {
  it('removes content padding from TAB_VIEWPORT widgets in view mode', () => {
    expect(
      getWidgetCardContentPadding({
        widget: tabViewportWidget,
        isEditable: false,
        variant: 'flush',
      }),
    ).toBe('none');

    expect(
      getWidgetCardContentPadding({
        widget: tabViewportWidget,
        isEditable: false,
        variant: 'framed',
      }),
    ).toBe('none');
  });

  it('keeps normal edit-mode padding and chrome', () => {
    expect(
      getWidgetCardContentPadding({
        widget: tabViewportWidget,
        isEditable: true,
        variant: 'flush',
      }),
    ).toBe('default');
  });

  it('does not change a normal fit-content front component', () => {
    expect(
      getWidgetCardContentPadding({
        widget: {
          ...tabViewportWidget,
          position: {
            ...tabViewportWidget.position,
            heightBehavior:
              PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
          },
        },
        isEditable: false,
        variant: 'flush',
      }),
    ).toBe('default');
  });
});

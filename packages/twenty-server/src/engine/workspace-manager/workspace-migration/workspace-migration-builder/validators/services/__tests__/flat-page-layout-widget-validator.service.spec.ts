import {
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from 'twenty-shared/types';

import { FlatPageLayoutWidgetTypeValidatorService } from 'src/engine/metadata-modules/flat-page-layout-widget/services/flat-page-layout-widget-type-validator.service';
import { type UniversalFlatPageLayoutWidget } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout-widget.type';
import { FlatPageLayoutWidgetValidatorService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/services/flat-page-layout-widget-validator.service';

const TAB_UNIVERSAL_IDENTIFIER = '00000000-0000-4000-8000-000000000001';

const buildWidget = ({
  universalIdentifier,
  index,
  heightBehavior,
}: {
  universalIdentifier: string;
  index: number;
  heightBehavior?: PageLayoutWidgetVerticalListHeightBehavior;
}) =>
  ({
    universalIdentifier,
    title: universalIdentifier,
    type: WidgetType.FRONT_COMPONENT,
    isActive: true,
    pageLayoutTabUniversalIdentifier: TAB_UNIVERSAL_IDENTIFIER,
    universalOverrides: null,
    position: {
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      index,
      heightBehavior,
    },
  }) as unknown as UniversalFlatPageLayoutWidget;

describe('FlatPageLayoutWidgetValidatorService', () => {
  const typeValidator = {
    validateFlatPageLayoutWidgetTypeSpecificitiesForCreation: () => [],
    validateFlatPageLayoutWidgetTypeSpecificitiesForUpdate: () => [],
  } as unknown as FlatPageLayoutWidgetTypeValidatorService;
  const service = new FlatPageLayoutWidgetValidatorService(typeValidator);

  const validateCreation = async ({
    widget,
    siblingWidgets = [],
  }: {
    widget: UniversalFlatPageLayoutWidget;
    siblingWidgets?: UniversalFlatPageLayoutWidget[];
  }) =>
    service.validateFlatPageLayoutWidgetCreation({
      flatEntityToValidate: widget,
      optimisticFlatEntityMapsAndRelatedFlatEntityMaps: {
        flatPageLayoutWidgetMaps: {
          byUniversalIdentifier: Object.fromEntries(
            siblingWidgets.map((siblingWidget) => [
              siblingWidget.universalIdentifier,
              siblingWidget,
            ]),
          ),
        },
        flatPageLayoutTabMaps: {
          byUniversalIdentifier: {
            [TAB_UNIVERSAL_IDENTIFIER]: {
              universalIdentifier: TAB_UNIVERSAL_IDENTIFIER,
              layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
            },
          },
        },
      },
      remainingFlatEntityMapsToValidate: { byUniversalIdentifier: {} },
      additionalCacheDataMaps: { featureFlagsMap: {} },
    } as unknown as Parameters<
      FlatPageLayoutWidgetValidatorService['validateFlatPageLayoutWidgetCreation']
    >[0]);

  it('rejects a second active TAB_VIEWPORT widget in the same tab', async () => {
    const result = await validateCreation({
      widget: buildWidget({
        universalIdentifier: 'viewport-2',
        index: 1,
        heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      }),
      siblingWidgets: [
        buildWidget({
          universalIdentifier: 'viewport-1',
          index: 0,
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
        }),
      ],
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining(
            'only one active TAB_VIEWPORT widget',
          ),
        }),
      ]),
    );
  });

  it('rejects TAB_VIEWPORT before an active fit-content widget', async () => {
    const result = await validateCreation({
      widget: buildWidget({
        universalIdentifier: 'viewport',
        index: 0,
        heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      }),
      siblingWidgets: [
        buildWidget({
          universalIdentifier: 'fit-content',
          index: 1,
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
        }),
      ],
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining(
            'must be ordered after fit-content widgets',
          ),
        }),
      ]),
    );
  });

  it('rejects a fit-content widget inserted after TAB_VIEWPORT', async () => {
    const result = await validateCreation({
      widget: buildWidget({
        universalIdentifier: 'fit-content',
        index: 1,
      }),
      siblingWidgets: [
        buildWidget({
          universalIdentifier: 'viewport',
          index: 0,
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
        }),
      ],
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining(
            'must be ordered after fit-content widgets',
          ),
        }),
      ]),
    );
  });

  it('accepts one trailing TAB_VIEWPORT widget', async () => {
    const result = await validateCreation({
      widget: buildWidget({
        universalIdentifier: 'viewport',
        index: 1,
        heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      }),
      siblingWidgets: [
        buildWidget({
          universalIdentifier: 'fit-content',
          index: 0,
        }),
      ],
    });

    expect(result.errors).toEqual([]);
  });
});

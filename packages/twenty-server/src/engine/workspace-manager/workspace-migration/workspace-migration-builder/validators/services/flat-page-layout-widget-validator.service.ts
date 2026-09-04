import { Injectable } from '@nestjs/common';

import { msg, t } from '@lingui/core/macro';
import { ALL_METADATA_NAME } from 'twenty-shared/metadata';
import {
  PageLayoutTabLayoutMode,
  PageLayoutWidgetPosition,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-shared/types';
import { isDefined, isViewportFillingWidgetType } from 'twenty-shared/utils';

import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { FlatPageLayoutWidgetTypeValidatorService } from 'src/engine/metadata-modules/flat-page-layout-widget/services/flat-page-layout-widget-type-validator.service';
import { PageLayoutTabExceptionCode } from 'src/engine/metadata-modules/page-layout-tab/exceptions/page-layout-tab.exception';
import {
  generatePageLayoutWidgetExceptionMessage,
  PageLayoutWidgetExceptionCode,
  PageLayoutWidgetExceptionMessageKey,
} from 'src/engine/metadata-modules/page-layout-widget/exceptions/page-layout-widget.exception';
import { validatePageLayoutWidgetGridPosition } from 'src/engine/metadata-modules/page-layout-widget/utils/validate-page-layout-widget-grid-position.util';
import { validatePageLayoutWidgetVerticalListPosition } from 'src/engine/metadata-modules/page-layout-widget/utils/validate-page-layout-widget-vertical-list-position.util';
import { type UniversalFlatPageLayoutTab } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout-tab.type';
import { type UniversalFlatPageLayoutWidget } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout-widget.type';
import {
  FailedFlatEntityValidation,
  FlatEntityValidationError,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/types/failed-flat-entity-validation.type';
import { getEmptyFlatEntityValidationError } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/utils/get-flat-entity-validation-error.util';
import { FlatEntityUpdateValidationArgs } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/types/universal-flat-entity-update-validation-args.type';
import { UniversalFlatEntityValidationArgs } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/types/universal-flat-entity-validation-args.type';

@Injectable()
export class FlatPageLayoutWidgetValidatorService {
  constructor(
    private readonly flatPageLayoutWidgetTypeValidatorService: FlatPageLayoutWidgetTypeValidatorService,
  ) {}

  public async validateFlatPageLayoutWidgetUpdate({
    universalIdentifier,
    flatEntityUpdate,
    finalFlatEntityMaps,
    optimisticFlatEntityMapsAndRelatedFlatEntityMaps,
    additionalCacheDataMaps: { featureFlagsMap },
    workspaceId,
    buildOptions,
  }: FlatEntityUpdateValidationArgs<
    typeof ALL_METADATA_NAME.pageLayoutWidget
  >): Promise<FailedFlatEntityValidation<'pageLayoutWidget', 'update'>> {
    const existingFlatPageLayoutWidget = findFlatEntityByUniversalIdentifier({
      universalIdentifier,
      flatEntityMaps:
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps.flatPageLayoutWidgetMaps,
    });

    const validationResult = getEmptyFlatEntityValidationError({
      flatEntityMinimalInformation: {
        universalIdentifier,
      },
      metadataName: 'pageLayoutWidget',
      type: 'update',
    });

    if (!isDefined(existingFlatPageLayoutWidget)) {
      validationResult.errors.push({
        code: PageLayoutWidgetExceptionCode.PAGE_LAYOUT_WIDGET_NOT_FOUND,
        message: t`Page layout widget to update not found`,
        userFriendlyMessage: msg`Page layout widget to update not found`,
      });

      return validationResult;
    }

    const updatedFlatPageLayoutWidget = {
      ...existingFlatPageLayoutWidget,
      ...flatEntityUpdate,
    };

    const effectivePageLayoutTabUniversalIdentifier =
      this.getEffectivePageLayoutTabUniversalIdentifier(
        updatedFlatPageLayoutWidget,
      );

    validationResult.flatEntityMinimalInformation = {
      ...validationResult.flatEntityMinimalInformation,
      pageLayoutTabUniversalIdentifier:
        effectivePageLayoutTabUniversalIdentifier,
    };

    const referencedPageLayoutTab = findFlatEntityByUniversalIdentifier({
      universalIdentifier: effectivePageLayoutTabUniversalIdentifier,
      flatEntityMaps:
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps.flatPageLayoutTabMaps,
    });

    if (!isDefined(referencedPageLayoutTab)) {
      validationResult.errors.push({
        code: PageLayoutTabExceptionCode.PAGE_LAYOUT_TAB_NOT_FOUND,
        message: t`Page layout tab not found`,
        userFriendlyMessage: msg`Page layout tab not found`,
      });
    }

    const positionErrors = this.validatePosition({
      position: this.getEffectivePosition(updatedFlatPageLayoutWidget),
      pageLayoutTab: referencedPageLayoutTab,
      widgetTitle: updatedFlatPageLayoutWidget.title,
    });

    validationResult.errors.push(...positionErrors);
    validationResult.errors.push(
      ...this.validateTabViewportConstraints({
        widget: updatedFlatPageLayoutWidget,
        relatedWidgets: Object.values(
          finalFlatEntityMaps.byUniversalIdentifier,
        ).filter(isDefined),
      }),
    );

    const typeSpecificityErrors =
      this.flatPageLayoutWidgetTypeValidatorService.validateFlatPageLayoutWidgetTypeSpecificitiesForUpdate(
        {
          flatEntityToValidate: updatedFlatPageLayoutWidget,
          optimisticFlatEntityMapsAndRelatedFlatEntityMaps,
          update: flatEntityUpdate,
          additionalCacheDataMaps: { featureFlagsMap },
          workspaceId,
          buildOptions,
          remainingFlatEntityMapsToValidate:
            optimisticFlatEntityMapsAndRelatedFlatEntityMaps.flatPageLayoutWidgetMaps,
        },
      );

    validationResult.errors.push(...typeSpecificityErrors);

    return validationResult;
  }

  public validateFlatPageLayoutWidgetDeletion({
    flatEntityToValidate: { universalIdentifier },
    optimisticFlatEntityMapsAndRelatedFlatEntityMaps: {
      flatPageLayoutWidgetMaps: optimisticFlatPageLayoutWidgetMaps,
    },
  }: UniversalFlatEntityValidationArgs<
    typeof ALL_METADATA_NAME.pageLayoutWidget
  >): FailedFlatEntityValidation<'pageLayoutWidget', 'delete'> {
    const validationResult = getEmptyFlatEntityValidationError({
      flatEntityMinimalInformation: {
        universalIdentifier,
      },
      metadataName: 'pageLayoutWidget',
      type: 'delete',
    });

    const existingFlatPageLayoutWidget = findFlatEntityByUniversalIdentifier({
      universalIdentifier,
      flatEntityMaps: optimisticFlatPageLayoutWidgetMaps,
    });

    if (!isDefined(existingFlatPageLayoutWidget)) {
      validationResult.errors.push({
        code: PageLayoutWidgetExceptionCode.PAGE_LAYOUT_WIDGET_NOT_FOUND,
        message: t`Page layout widget to delete not found`,
        userFriendlyMessage: msg`Page layout widget to delete not found`,
      });

      return validationResult;
    }

    return validationResult;
  }

  public async validateFlatPageLayoutWidgetCreation({
    flatEntityToValidate: flatPageLayoutWidgetToValidate,
    additionalCacheDataMaps: { featureFlagsMap },
    optimisticFlatEntityMapsAndRelatedFlatEntityMaps,
    workspaceId,
    buildOptions,
    remainingFlatEntityMapsToValidate,
  }: UniversalFlatEntityValidationArgs<
    typeof ALL_METADATA_NAME.pageLayoutWidget
  >): Promise<FailedFlatEntityValidation<'pageLayoutWidget', 'create'>> {
    const validationResult = getEmptyFlatEntityValidationError({
      flatEntityMinimalInformation: {
        universalIdentifier: flatPageLayoutWidgetToValidate.universalIdentifier,
        pageLayoutTabUniversalIdentifier:
          flatPageLayoutWidgetToValidate.pageLayoutTabUniversalIdentifier,
      },
      metadataName: 'pageLayoutWidget',
      type: 'create',
    });

    const existingFlatPageLayoutWidget = findFlatEntityByUniversalIdentifier({
      universalIdentifier: flatPageLayoutWidgetToValidate.universalIdentifier,
      flatEntityMaps:
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps.flatPageLayoutWidgetMaps,
    });

    if (isDefined(existingFlatPageLayoutWidget)) {
      const flatPageLayoutWidgetUniversalIdentifier =
        flatPageLayoutWidgetToValidate.universalIdentifier;

      validationResult.errors.push({
        code: PageLayoutWidgetExceptionCode.INVALID_PAGE_LAYOUT_WIDGET_DATA,
        message: t`Page layout widget with universal identifier ${flatPageLayoutWidgetUniversalIdentifier} already exists`,
        userFriendlyMessage: msg`Page layout widget already exists`,
      });
    }

    const referencedPageLayoutTab = findFlatEntityByUniversalIdentifier({
      universalIdentifier:
        flatPageLayoutWidgetToValidate.pageLayoutTabUniversalIdentifier,
      flatEntityMaps:
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps.flatPageLayoutTabMaps,
    });

    if (!isDefined(referencedPageLayoutTab)) {
      validationResult.errors.push({
        code: PageLayoutTabExceptionCode.PAGE_LAYOUT_TAB_NOT_FOUND,
        message: t`Page layout tab not found`,
        userFriendlyMessage: msg`Page layout tab not found`,
      });
    }

    const positionErrors = this.validatePosition({
      position: this.getEffectivePosition(flatPageLayoutWidgetToValidate),
      pageLayoutTab: referencedPageLayoutTab,
      widgetTitle: flatPageLayoutWidgetToValidate.title,
    });

    validationResult.errors.push(...positionErrors);
    validationResult.errors.push(
      ...this.validateTabViewportConstraints({
        widget: flatPageLayoutWidgetToValidate,
        relatedWidgets: [
          ...Object.values(
            optimisticFlatEntityMapsAndRelatedFlatEntityMaps
              .flatPageLayoutWidgetMaps.byUniversalIdentifier,
          ).filter(isDefined),
          ...Object.values(
            remainingFlatEntityMapsToValidate.byUniversalIdentifier,
          ).filter(isDefined),
        ],
      }),
    );

    const typeSpecificityErrors =
      this.flatPageLayoutWidgetTypeValidatorService.validateFlatPageLayoutWidgetTypeSpecificitiesForCreation(
        {
          flatEntityToValidate: flatPageLayoutWidgetToValidate,
          optimisticFlatEntityMapsAndRelatedFlatEntityMaps,
          additionalCacheDataMaps: { featureFlagsMap },
          workspaceId,
          buildOptions,
          remainingFlatEntityMapsToValidate,
        },
      );

    validationResult.errors.push(...typeSpecificityErrors);

    return validationResult;
  }

  private getEffectivePageLayoutTabUniversalIdentifier(
    widget: Pick<
      UniversalFlatPageLayoutWidget,
      'pageLayoutTabUniversalIdentifier' | 'universalOverrides'
    >,
  ): string {
    return (
      widget.universalOverrides?.pageLayoutTabUniversalIdentifier ??
      widget.pageLayoutTabUniversalIdentifier
    );
  }

  private getEffectivePosition(
    widget: Pick<
      UniversalFlatPageLayoutWidget,
      'position' | 'universalOverrides'
    >,
  ): PageLayoutWidgetPosition | null | undefined {
    if (
      isDefined(widget.universalOverrides) &&
      Object.prototype.hasOwnProperty.call(
        widget.universalOverrides,
        'position',
      )
    ) {
      return widget.universalOverrides.position;
    }

    return widget.position;
  }

  private validateTabViewportConstraints({
    widget,
    relatedWidgets,
  }: {
    widget: UniversalFlatPageLayoutWidget;
    relatedWidgets: UniversalFlatPageLayoutWidget[];
  }): FlatEntityValidationError[] {
    const position = this.getEffectivePosition(widget);

    if (
      !widget.isActive ||
      !isDefined(position) ||
      position.layoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST
    ) {
      return [];
    }

    const isTabViewportWidget = this.isViewportFillingWidget(widget);

    const pageLayoutTabUniversalIdentifier =
      this.getEffectivePageLayoutTabUniversalIdentifier(widget);
    const activeSiblingWidgets = relatedWidgets.filter(
      (relatedWidget) =>
        relatedWidget.universalIdentifier !== widget.universalIdentifier &&
        relatedWidget.isActive &&
        this.getEffectivePageLayoutTabUniversalIdentifier(relatedWidget) ===
          pageLayoutTabUniversalIdentifier,
    );

    const errors: FlatEntityValidationError[] = [];
    const hasAnotherTabViewportWidget = activeSiblingWidgets.some(
      (siblingWidget) => {
        const siblingPosition = this.getEffectivePosition(siblingWidget);

        return this.isViewportFillingWidget(siblingWidget);
      },
    );

    if (isTabViewportWidget && hasAnotherTabViewportWidget) {
      errors.push({
        code: PageLayoutWidgetExceptionCode.INVALID_PAGE_LAYOUT_WIDGET_DATA,
        message: generatePageLayoutWidgetExceptionMessage(
          PageLayoutWidgetExceptionMessageKey.INVALID_WIDGET_POSITION,
          widget.title,
          undefined,
          'only one active TAB_VIEWPORT widget is allowed per vertical-list tab',
        ),
        userFriendlyMessage: msg`Only one full-height widget is allowed per tab`,
      });
    }

    const hasInvalidWidgetOrdering = activeSiblingWidgets.some(
      (siblingWidget) => {
        const siblingPosition = this.getEffectivePosition(siblingWidget);

        if (
          !isDefined(siblingPosition) ||
          siblingPosition.layoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST
        ) {
          return false;
        }

        const isSiblingTabViewport =
          this.isViewportFillingWidget(siblingWidget);

        return isTabViewportWidget
          ? !isSiblingTabViewport && siblingPosition.index >= position.index
          : isSiblingTabViewport && siblingPosition.index <= position.index;
      },
    );

    if (hasInvalidWidgetOrdering) {
      errors.push({
        code: PageLayoutWidgetExceptionCode.INVALID_PAGE_LAYOUT_WIDGET_DATA,
        message: generatePageLayoutWidgetExceptionMessage(
          PageLayoutWidgetExceptionMessageKey.INVALID_WIDGET_POSITION,
          widget.title,
          undefined,
          'TAB_VIEWPORT widgets must be ordered after fit-content widgets',
        ),
        userFriendlyMessage: msg`Full-height widgets must be placed after fit-content widgets`,
      });
    }

    return errors;
  }

  private isViewportFillingWidget(
    widget: UniversalFlatPageLayoutWidget,
  ): boolean {
    const position = this.getEffectivePosition(widget);

    if (
      !isDefined(position) ||
      position.layoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST
    ) {
      return false;
    }

    if (isDefined(position.heightBehavior)) {
      return (
        position.heightBehavior ===
        PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT
      );
    }

    return isViewportFillingWidgetType(widget.type);
  }

  private validatePosition({
    position,
    pageLayoutTab,
    widgetTitle,
  }: {
    position: PageLayoutWidgetPosition | null | undefined;
    pageLayoutTab: UniversalFlatPageLayoutTab | undefined;
    widgetTitle: string;
  }): FlatEntityValidationError[] {
    if (!isDefined(position)) {
      return [];
    }

    const errors: FlatEntityValidationError[] = [];

    if (
      isDefined(pageLayoutTab) &&
      position.layoutMode !== pageLayoutTab.layoutMode
    ) {
      const layoutMode = position.layoutMode;
      const tabLayoutMode = pageLayoutTab.layoutMode;

      errors.push({
        code: PageLayoutWidgetExceptionCode.INVALID_PAGE_LAYOUT_WIDGET_DATA,
        message: t`Position layoutMode "${layoutMode}" does not match tab layoutMode "${tabLayoutMode}"`,
        userFriendlyMessage: msg`Widget position type must match the tab layout mode`,
      });
    }

    switch (position.layoutMode) {
      case PageLayoutTabLayoutMode.GRID:
        errors.push(
          ...validatePageLayoutWidgetGridPosition(position, widgetTitle),
        );
        break;
      case PageLayoutTabLayoutMode.VERTICAL_LIST:
        errors.push(
          ...validatePageLayoutWidgetVerticalListPosition(
            position,
            widgetTitle,
          ),
        );
        break;
      case PageLayoutTabLayoutMode.CANVAS:
        break;
      default:
        errors.push({
          code: PageLayoutWidgetExceptionCode.INVALID_PAGE_LAYOUT_WIDGET_DATA,
          message: t`Invalid widget position layout mode`,
          userFriendlyMessage: msg`Invalid widget position layout mode`,
        });
    }

    return errors;
  }
}

import { WidgetType } from '@/types';

export const isViewportFillingWidgetType = (
  widgetType: WidgetType,
): boolean => {
  switch (widgetType) {
    case WidgetType.CALENDAR:
    case WidgetType.CALL_RECORDING_SUMMARY:
    case WidgetType.CALL_RECORDING_TRANSCRIPT:
    case WidgetType.EMAILS:
    case WidgetType.EMAIL_THREAD:
    case WidgetType.FILES:
    case WidgetType.NOTES:
    case WidgetType.TASKS:
    case WidgetType.TIMELINE:
    case WidgetType.WORKFLOW:
    case WidgetType.WORKFLOW_RUN:
    case WidgetType.WORKFLOW_VERSION:
      return true;

    case WidgetType.IFRAME:
    case WidgetType.RECORD_TABLE:
    case WidgetType.MESSAGE_CAMPAIGN_BODY:
    case WidgetType.MESSAGE_CAMPAIGN_DETAILS:
    case WidgetType.FIELD:
    case WidgetType.FIELDS:
    case WidgetType.FORM_FIELD:
    case WidgetType.FIELD_RICH_TEXT:
    case WidgetType.FRONT_COMPONENT:
    case WidgetType.GRAPH:
    case WidgetType.STANDALONE_RICH_TEXT:
    case WidgetType.VIEW:
      return false;
  }
};

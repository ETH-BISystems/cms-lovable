// Calendar Module — Public API

// Page Component
export { CalendarPage } from './components/CalendarPage';

// Context Provider
export { CalendarProvider, useCalendarContext } from './context/CalendarContext';

// Types
export type {
  ContentType,
  TimeSlot,
  CalendarEvent,
  CalendarFilters,
  TopicCollision,
  CapacityMetrics,
  DailyVelocity,
  VelocityMetrics,
  CreateCalendarEventInput,
  CreateCalendarEventOutput,
  UpdateCalendarEventInput,
  UpdateCalendarEventOutput,
  DeleteCalendarEventInput,
  DeleteCalendarEventOutput,
  SyncCalendarInput,
  SyncCalendarOutput,
  AutoScheduleInput,
  AutoScheduleOutput,
} from './types';

// Route definitions
export const calendarRoutes = [
  { path: '/calendar', label: 'Calendar', icon: 'Calendar' },
];

// Navigation metadata for shell integration
export const calendarNavigation = {
  label: 'Calendar',
  icon: 'Calendar',
  children: [
    { path: '/calendar', label: 'Editorial Calendar' },
  ],
};

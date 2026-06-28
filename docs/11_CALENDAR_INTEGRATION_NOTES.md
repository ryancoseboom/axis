# Calendar Integration Notes

Axis currently has a calendar adapter boundary but no live Google Calendar integration.

Future live integration will need:

- OAuth consent and token refresh outside the Decision Graph.
- A Google Calendar fetcher that returns Google-shaped events for a selected day.
- Time zone handling before events enter `GoogleCalendarAdapter`.
- Calendar selection rules for primary, work, personal, and shared calendars.
- Recurring event expansion handled by the provider API before mapping.
- Error states that fail quietly back to manual Morning input.

The Decision Graph should continue consuming only `CalendarContext`.

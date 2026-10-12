# TradeQuest accessibility

## Implemented in the interface

- A keyboard-reachable “Skip to main content” link and a focusable main landmark.
- Named primary navigation, an accessible mobile menu state with aria-expanded and aria-controls, and current-page semantics on the active navigation item.
- Visible keyboard focus indicators for buttons, links, inputs, selects, and textareas.
- Reduced-motion styling via prefers-reduced-motion.
- Existing modal focus management and labelled scenario charts/controls are retained.

These are code-level safeguards, not evidence of a complete accessibility audit.

## Manual release checks

Record the browser, operating system, assistive technology, date, and result for each check:

1. **Keyboard only:** Use Tab/Shift+Tab, Enter, Space, and Escape to navigate, open/close the mobile menu and dialogs, select scenarios, submit forms, and reach every action without a pointer. Verify focus remains visible and is not trapped behind a closed overlay.
2. **Skip link and landmarks:** Tab from page load; the skip link must appear and move focus to the main content. Verify the main navigation and main landmark are announced with useful names.
3. **Screen reader:** Test at least VoiceOver on iOS/Safari and NVDA on Windows/Firefox or Chrome. Verify headings, current navigation, form labels, validation errors, progress/status updates, dialogs, and event-ledger lists are announced meaningfully.
4. **Zoom and reflow:** At 200% zoom and at 320 CSS-pixel viewport width, confirm there is no two-dimensional scrolling for ordinary content, clipped controls, overlapping dialogs, or lost functionality.
5. **Contrast and non-colour cues:** Check text, disabled states, focus rings, charts, selected states, success/error messages, and charts in high-contrast modes. Do not rely on colour alone to communicate correctness or risk.
6. **Motion:** Enable reduced motion and verify transitions/animations are reduced without hiding information or breaking navigation.
7. **Core learning journeys:** Complete a lesson/quiz, change a weekly target, record/undo a session, export account data, inspect a paper-trade ledger, and dismiss/submit each modal using keyboard only.

## Known limitations

- Automated source checks can protect navigation semantics and focus styles, but they do not replace browser-based axe/Lighthouse testing or manual assistive-technology testing.
- No screen-reader or physical mobile-device run should be marked complete unless a human actually performs it and records evidence.
- Synthetic charts and ledger history must remain understandable without visual colour cues. Include textual status/outcome summaries alongside graphics.

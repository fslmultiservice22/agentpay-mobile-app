import { describe, expect, it } from "vitest";

import {
  dismissFinancialNotice,
  initialFinancialNoticeState,
  toggleFinancialNoticeDetails,
  toggleFinancialUpdatesOptIn,
} from "../lib/financial-notice";

describe("financial notice UI state", () => {
  it("starts visible, collapsed, and opted out", () => {
    expect(initialFinancialNoticeState).toEqual({
      visible: true,
      detailsExpanded: false,
      updatesOptedIn: false,
    });
  });

  it("expands and collapses the explanatory tooltip", () => {
    const expanded = toggleFinancialNoticeDetails(initialFinancialNoticeState);
    expect(expanded.detailsExpanded).toBe(true);
    expect(toggleFinancialNoticeDetails(expanded).detailsExpanded).toBe(false);
  });

  it("dismisses the notice and closes its details", () => {
    const expanded = toggleFinancialNoticeDetails(initialFinancialNoticeState);
    expect(dismissFinancialNotice(expanded)).toEqual({
      visible: false,
      detailsExpanded: false,
      updatesOptedIn: false,
    });
  });

  it("stores only a local future-update preference", () => {
    const optedIn = toggleFinancialUpdatesOptIn(initialFinancialNoticeState);
    expect(optedIn.updatesOptedIn).toBe(true);
    expect(toggleFinancialUpdatesOptIn(optedIn).updatesOptedIn).toBe(false);
  });
});

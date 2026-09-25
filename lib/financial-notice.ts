export type FinancialNoticeState = {
  visible: boolean;
  detailsExpanded: boolean;
  updatesOptedIn: boolean;
};

export const initialFinancialNoticeState: FinancialNoticeState = {
  visible: true,
  detailsExpanded: false,
  updatesOptedIn: false,
};

export function dismissFinancialNotice(state: FinancialNoticeState): FinancialNoticeState {
  return { ...state, visible: false, detailsExpanded: false };
}

export function toggleFinancialNoticeDetails(state: FinancialNoticeState): FinancialNoticeState {
  return { ...state, detailsExpanded: !state.detailsExpanded };
}

export function toggleFinancialUpdatesOptIn(state: FinancialNoticeState): FinancialNoticeState {
  return { ...state, updatesOptedIn: !state.updatesOptedIn };
}

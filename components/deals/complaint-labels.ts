import type { Dictionary } from '@/lib/i18n';
import { CODE_ISSUES, REPORT_REASONS, USED_CODE_ISSUES } from '@/modules/reports';

/** Texts and reasons for a complaint about a deal or a business. */
export function reportProps(t: Dictionary) {
  return {
    reasons: REPORT_REASONS.map((value) => ({ value, label: t.reports.reasons[value] })),
    labels: { ...t.complaint, networkError: t.common.networkError },
  };
}

/** Texts and reasons for "the deal was not honoured" about a booked code (a used one: only the price). */
export function codeIssueProps(t: Dictionary, used: boolean) {
  return {
    reasons: (used ? USED_CODE_ISSUES : CODE_ISSUES).map((value) => ({ value, label: t.reports.reasons[value] })),
    labels: { ...t.complaint, button: t.complaint.codeButton, title: t.complaint.codeTitle, thanks: t.complaint.codeSent, networkError: t.common.networkError },
  };
}

export const ENQUIRY_STATUSES = ["new", "contacted", "scheduled", "completed", "closed", "spam"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

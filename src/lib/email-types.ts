/** Cold email sequence types for CRM */
export const CRM_EMAIL_TYPES = [
  { value: "first_contact", label: "First contact" },
  { value: "second_follow_up", label: "Second follow-up" },
  { value: "third_follow_up", label: "Third follow-up" },
  { value: "final_follow_up", label: "Final follow-up" },
  { value: "value_reminder", label: "Value reminder" },
] as const;

export type CrmEmailType = (typeof CRM_EMAIL_TYPES)[number]["value"];

/** Channel for the generated message */
export const MESSAGE_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn message" },
] as const;

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number]["value"];

/** Languages for cold email generation */
export const EMAIL_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
] as const;

export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number]["value"];

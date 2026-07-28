export const BLOG_TOPICS = [
  ["BUSINESS_TECHNOLOGY", "Business technology"],
  ["BUYING_GUIDES", "Buying guides"],
  ["CYBERSECURITY", "Cybersecurity"],
  ["PRODUCTIVITY", "Workplace productivity"],
  ["BACKUP_POWER", "Backup power"],
  ["NETWORKING", "Networking"],
  ["PROCUREMENT", "Technology procurement"],
] as const;

export const BLOG_AUDIENCES = [
  ["SMALL_BUSINESS", "Small businesses"],
  ["ENTERPRISE", "Larger organisations"],
  ["PUBLIC_SECTOR", "Public-sector teams"],
  ["HOME_OFFICE", "Home-office buyers"],
  ["ALL", "All technology buyers"],
] as const;

export function blogLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

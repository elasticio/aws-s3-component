export const ATTACHMENT_MAX_SIZE = process.env.ATTACHMENT_MAX_SIZE
  ? parseInt(process.env.ATTACHMENT_MAX_SIZE, 10)
  : 1024 * 1024 * 100;

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 16);

export function generateRunId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}-${nanoid()}`;
}

export function generateTransactionId(month: string) {
  return `tx-${month}-${nanoid()}`;
}

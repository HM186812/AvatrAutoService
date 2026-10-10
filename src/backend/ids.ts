import { v7 as uuidv7 } from 'uuid';

export function newRecordId(): string {
  return uuidv7();
}

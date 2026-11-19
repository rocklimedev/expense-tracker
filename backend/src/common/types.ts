import { Permission } from './permissions';

export interface AuthUser {
  id: number;
  name: string;
  role: string;
  permissions: Permission[];
}

import { Permission } from './permissions';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  permissions: Permission[];
}

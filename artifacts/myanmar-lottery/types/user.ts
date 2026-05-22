export type UserRole = "admin" | "content_creator" | "user";
export type UserStatus = "active" | "disabled";
export type UserApprovalStatus = "pending" | "approved" | "denied" | "terminated";
export type UserDataStatus = "pending" | "approved" | "denied" | "terminated";

export type ManagedUser = {
  id: string;
  username: string;
  email: string;
  phone: string;
  address?: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  approvalStatus: UserApprovalStatus;
  mustChangePassword: boolean;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

export type LoginResult = {
  token: string;
  user: ManagedUser;
  expiresAt: string;
};

export type CreateUserInput = {
  username: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  address?: string;
};

export type SignUpInput = {
  username: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
};

export type UserDataInput = {
  title: string;
  phone?: string;
  address?: string;
  note?: string;
};

export type UserDataRecord = {
  id: string;
  userId: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  title: string;
  note: string;
  status: UserDataStatus;
  createdAt: number;
  updatedAt: number;
};

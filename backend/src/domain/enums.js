export const ContractType = Object.freeze({
  RENTAL: 'rental',
  SUPPLY: 'supply',
  EMPLOYMENT: 'employment',
  FREELANCE: 'freelance',
  INSURANCE: 'insurance',
  SUBSCRIPTION: 'subscription',
  LOAN: 'loan',
  OTHER: 'other',
});

export const ContractRole = Object.freeze({
  TENANT: 'tenant',
  LANDLORD: 'landlord',
});

export const ContractStatus = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived',
});

export const Direction = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
});

export const RecurrenceType = Object.freeze({
  ONE_TIME: 'one_time',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
});

export const AmountType = Object.freeze({
  FIXED: 'fixed',
  VARIABLE: 'variable',
});

export const HouseType = Object.freeze({
  OWNED: 'owned',
  RENTED: 'rented',
  OTHER: 'other',
});

export const MemberRole = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const ContractTypeValues = Object.values(ContractType);
export const ContractRoleValues = Object.values(ContractRole);
export const ContractStatusValues = Object.values(ContractStatus);
export const DirectionValues = Object.values(Direction);
export const RecurrenceTypeValues = Object.values(RecurrenceType);
export const AmountTypeValues = Object.values(AmountType);
export const HouseTypeValues = Object.values(HouseType);
export const MemberRoleValues = Object.values(MemberRole);

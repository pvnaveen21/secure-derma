export class User {
  id?: number;
  username: string;
  password?: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: number;
  profile_image: any;
  companyName: string;
  customer: any;
  industryType: number;
  isSuperUser?: Boolean;
  permissions?: Array<string>;
  isAdmin?: boolean;
  accesses?: any;
  user_type?: any;
  latest_app: number;
  twoStepEnabled: boolean;
  twoFa_enabled: boolean;
  user_add_on: any;
  groups: string[] = [];

  constructor(data?: any) {
    if (!(data instanceof Object)) data = {};
    this.id = data['id'] || null;
    this.username = data['username'] || null;
    this.password = data['password'] || null;
    this.email = data['email'] || null;
    this.firstName = data['first_name'] || null;
    this.lastName = data['last_name'] || null;
    this.mobile = data['phone'] || null;
    this.profile_image = data['profile_image'] || null;
    this.companyName = data['company_name'] || null;
    this.customer = data['customer'] || null;
    this.industryType = data['industry'] || null;
    this.isSuperUser = data['is_superuser'] || null;
    this.permissions = data['permissions'] || null;
    this.isAdmin = data['isAdmin'] || null;
    this.accesses = data['accesses'] || null;
    this.user_type = data['user_type'] || null;
    this.latest_app = data['latest_app'] || null;
    this.twoStepEnabled = data['twoStepEnabled'] || false;
    this.twoFa_enabled = data['twoFa_enabled'] || false;
    this.user_add_on = data['user_add_on'] || null;
    this.groups = data['groups'] || [];
  }
}

export class Roles {
  id: number;
  name: string;
  alias: string;
  created_by: string;
  accesses: any;
  description: string = '';
  created_at: Date;
  modified_at: Date;

  constructor(data?: any) {
    if (!(data instanceof Object)) data = {};
    this.id = data['id'] || null;
    this.name = data['id'] || null;
    this.alias = data['id'] || null;
    this.created_by = data['id'] || null;
    this.created_at = data['id'] || null;
    this.modified_at = data['id'] || null;
    this.description = data['description'] || this.description;
  }
}

export function UserType() {
  let item: Array<any> = [
    { id: 2, text: 'SystemAdmin', letter: 'S' },
    { id: 3, text: 'Manager', letter: 'M' },
    { id: 4, text: 'Developer', letter: 'D' }
  ];
  return item;
}

export class UserCreate {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public first_name?: string,
    public last_name?: string,
    public mobile?: string,
    public role_id?: any,
    public permissions?: any,
    public accesses?: any,
    public is_superuser?: Boolean,
    public user_type?: any,
    public image?: any,
    public company_name?: string,
    public industry?: number,
    public role_id_id?: any,
  ) {
  }
}

export function IndustryType() {
  let item: Array<any> = [
    { 'text': "IT", 'id': 1 },
    { 'text': 'Production', 'id': 2 },
    { 'text': 'Manufacturing', 'id': 3 },
    { 'text': 'Service', 'id': 4 },
    { 'text': 'Non profit', 'id': 5 }
  ];
  return item;
}

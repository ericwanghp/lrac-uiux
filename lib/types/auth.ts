export interface AuthSession {
  token: string;
  memberId: string;
  projectRoot: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthSessionsEnvelope {
  version: "1.0";
  sessions: AuthSession[];
}

export interface MemberCredentialRecord {
  memberId: string;
  passwordHash: string;
  passwordSalt: string;
  updatedAt: string;
}

export interface MemberCredentialsEnvelope {
  version: "1.0";
  credentials: MemberCredentialRecord[];
}

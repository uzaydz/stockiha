// أنواع domain_verifications منفصلة لتجنب التضارب
export interface DomainVerificationTable {
  Row: {
    id: string;
    organization_id: string;
    domain: string;
    status: string;
    verification_code?: string;
    verified_at?: string;
    error_message?: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    organization_id: string;
    domain: string;
    status: string;
    verification_code?: string;
    verified_at?: string;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    organization_id?: string;
    domain?: string;
    status?: string;
    verification_code?: string;
    verified_at?: string;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "domain_verifications_organization_id_fkey";
      columns: ["organization_id"];
      isOneToOne: false;
      referencedRelation: "organizations";
      referencedColumns: ["id"];
    }
  ];
}

// أنواع الحالة للتحقق من النطاق
export type DomainVerificationStatus = 'pending' | 'active' | 'verified' | 'error';

// واجهة استجابة حالة نطاق Vercel
export interface DomainVerificationResponse {
  verified: boolean;
  reason: string;
  message?: string;
  verification?: any;
  errorCode?: string;
}

// نموذج نتائج التحقق من DNS
export interface DNSVerificationResult {
  success: boolean;
  records: {
    name: string;
    type: string;
    value: string;
    status: 'valid' | 'invalid' | 'pending';
    expected: string;
  }[];
  message?: string;
}

// نموذج بيانات التحقق من النطاق
export interface DomainVerificationData {
  domain: string;
  status: DomainVerificationStatus;
  verificationData?: any;
  verifiedAt?: string;
  errorMessage?: string;
}

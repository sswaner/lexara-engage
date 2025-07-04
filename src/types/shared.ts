// Core system types for Engage Legal AI Platform

/// <reference types="@cloudflare/workers-types" />

export type ConversationPhase = 
  | 'pre_login' 
  | 'login_suggested' 
  | 'secured' 
  | 'conflict_check_complete' 
  | 'data_gathering' 
  | 'completed' 
  | 'terminated';

export type ConflictStatus = 'pending' | 'clear' | 'conflict_detected';

export type GoalPriority = 'critical' | 'required' | 'important' | 'optional';

export type GoalCategory = 'identification' | 'conflict_resolution' | 'legal_context' | 'incident_details' | 'evidence';

export type GoalSource = 'base' | 'additional' | 'conflict_checker' | 'manual';

// Multi-Tenant Types
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';
export type FirmRole = 'admin' | 'lawyer' | 'staff' | 'viewer';

export interface FirmBranding {
  logoUrl?: string;
  primaryColor: string;     // "#1a2b3c"
  secondaryColor: string;   // "#4a5b6c"
  fontFamily?: string;      // "Inter, sans-serif"
  customCss?: string;       // Advanced styling
}

export interface FirmSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  monthlyConversationLimit: number;
  currentUsage: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface FirmCompliance {
  hipaaEnabled: boolean;
  retentionPolicyDays: number;      // 90, 365, 2555 (7 years)
  allowAnonymousChats: boolean;
  requireAuth0Login: boolean;
  enableConflictChecking: boolean;
  autoDeleteAfterDays?: number;
}

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageConflicts: boolean;
  canViewAnalytics: boolean;
  canManageBilling: boolean;
  canManageBranding: boolean;
  canManageCompliance: boolean;
}

export interface FirmUser {
  auth0UserId: string;
  email: string;
  name: string;
  role: FirmRole;
  permissions: AdminPermissions;
  addedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Firm {
  firmId: string;           // ULID - Primary key
  name: string;             // "Smith & Associates Law"
  slug: string;             // "smith-associates" for subdomain
  domain?: string;          // Custom domain "intake.smithlaw.com"
  
  // Contact Information
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  website?: string;
  
  // Branding
  branding: FirmBranding;
  
  // Practice Configuration
  practiceAreas: string[];  // ["personal_injury", "employment_law"]
  restrictions: string[];   // Areas they don't handle
  supportingDocuments: string[]; // Document IDs in Vectorize
  
  // Business Configuration
  subscription: FirmSubscription;
  
  // Compliance Settings
  compliance: FirmCompliance;
  
  // Users and Access
  users: FirmUser[];        // All users with access to this firm
  
  // Metadata
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
  
  // Analytics (cached)
  analytics?: {
    totalConversations: number;
    monthlyConversations: number;
    conversionRate: number;
    avgResponseTime: number;
    lastCalculated: Date;
  };
}

export interface FirmContext {
  firm: Firm;
  currentUser?: FirmUser;
  isValidDomain: boolean;
  subdomain?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// HIPAA-enhanced message with encryption support
export interface EncryptedMessage extends Omit<Message, 'content'> {
  // Content handling
  content?: string;                 // Plain text (if not sensitive)
  encryptedContent?: {
    encryptedData: string;          // Base64 encoded
    iv: string;                     // Base64 encoded initialization vector
    authTag: string;                // Base64 encoded authentication tag
    algorithm: 'AES-256-GCM';
    keyId: string;                  // Reference to encryption key
  };
  isEncrypted: boolean;
  
  // HIPAA compliance
  classification: {
    containsPII: boolean;
    containsePHI: boolean;
    containsMedicalInfo: boolean;
    sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
    requiresEncryption: boolean;
  };
  
  // Data integrity
  integrityHash: string;
  
  // Audit trail
  encryptedBy?: string;             // System or user ID
  encryptionTimestamp?: Date;
}

export interface Goal {
  id: string;
  description: string;
  priority: GoalPriority;
  category: GoalCategory;
  completed: boolean;
  completionData?: Record<string, unknown>;
  addedAt: Date;
  source: GoalSource;
  relatedConflictId?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserIdentifiers {
  emails: string[];
  phones: string[];
  names: string[];
  addresses: Address[];
  companies: string[];
  aliases: string[];
}

// ConversationSession Durable Object State
export interface ConversationState {
  // Identity
  sessionId: string; // ULID
  userId: string;    // ULID, maps to Auth0 post-login
  firmId: string;    // ULID - Which firm owns this conversation
  
  // Firm Context (cached for performance)
  firmConfig?: {
    name: string;
    branding: FirmBranding;
    practiceAreas: string[];
    restrictions: string[];
    compliance: FirmCompliance;
  };
  
  // Authentication & Security
  isAuthenticated: boolean;
  auth0UserId?: string;
  isSecured: boolean; // true once login completed - conversation locked to auth user
  
  // Resume capability
  resumeToken: string; // Persistent, never expires
  resumeUrl: string;
  loginUrl?: string; // Generated when agent suggests login
  
  // Pre-login goals (must complete before login suggestion)
  preLoginGoals: {
    userIdentification: boolean;    // Basic name, contact info
    conflictCheck: boolean;         // Initial conflict assessment
    legalNeedsAssessment: boolean;  // General area of law, basic situation
  };
  
  // User identity (gathered pre-login, enhanced post-login)
  userIdentity: {
    // Pre-login (general identification)
    name?: string;
    email?: string;
    phone?: string;
    legalArea?: string;
    basicSituation?: string;
    
    // Post-login (detailed personal info)
    address?: string;
    detailedSituation?: string;
    // Additional sensitive details gathered post-login
  };
  
  // Workflow phases
  phase: ConversationPhase;
  
  // Conflict checking (permanent once detected)
  conflictCheck: {
    status: ConflictStatus;
    checkedAt?: Date;
    conflictDetails?: string;
    preLoginCheck: boolean; // Basic check done pre-login
    checkedIdentity: string[]; // Which identity fields were checked
  };
  
  // Data gathering
  dataGoals: Goal[];
  completedGoals: string[];
  supportDocuments: string[]; // IDs of relevant support docs found
  
  // Conversation history
  messages: Message[];
  
  // Access control
  allowedAuth0Users: string[]; // Only these users can access secured conversations
  
  // Metadata
  createdAt: Date;
  lastActivity: Date;
  isDeleted: boolean; // For admin deletion
  deletedAt?: Date;
  deletedBy?: string; // Admin/lawyer who deleted
}

// UserIdentity Durable Object State
export interface UserIdentityState {
  userId: string;    // ULID
  firmId: string;
  
  // Auth0 mapping
  auth0UserId?: string;
  
  // Identity aggregation from all sessions
  identifiers: UserIdentifiers;
  
  // Conflict status (permanent until firm removes conflict source)
  conflictStatus: {
    status: ConflictStatus;
    lastChecked: Date;
    conflictDetails?: string;
  };
  
  // Session tracking
  sessions: string[]; // All sessionIds for this user
  
  // Metadata
  createdAt: Date;
  lastActivity: Date;
}

// MCP Server Interfaces
export interface ConflictCheckRequest {
  firmId: string;
  userId: string;
  userIdentity: UserIdentifiers;
  previousCheckResult?: ConflictCheckResult;
}

export interface ConflictCheckResult {
  status: ConflictStatus;
  confidence: number;
  matchDetails: ConflictMatch[];
  additionalGoals: Goal[];
  stopConversation: boolean;
  checkedAt: Date;
  recommendation: 'proceed' | 'gather_more_info' | 'attorney_handoff';
}

export interface ConflictMatch {
  conflictEntryId: string;
  matchedFields: string[];
  matchType: 'exact' | 'fuzzy' | 'semantic';
  confidence: number;
  suggestedGoals: Goal[];
}

export interface GoalStatusResult {
  totalGoals: number;
  completedGoals: number;
  criticalIncomplete: Goal[];
  requiredIncomplete: Goal[];
  conflictResolutionGoals: Goal[];
  readyForNextPhase: boolean;
  blockers: string[];
}

export interface AgentRecommendation {
  action: 'continue_gathering' | 'suggest_login' | 'check_conflicts' | 'search_additional_goals' | 'complete_conversation';
  reasoning: string;
  priorityGoals: Goal[];
  suggestedQuestions: string[];
}

export interface LoginReadinessAssessment {
  ready: boolean;
  completedCriteria: string[];
  remainingCriteria: string[];
  confidence: number;
  reasoning: string;
}

// Agent Response Types
export interface AgentResponse {
  message: string;
  suggestLogin?: boolean;
  loginUrl?: string;
  stopConversation?: boolean;
  conversationComplete?: boolean;
  resumeUrl: string;
}

// Environment bindings
export interface Env {
  // Durable Object bindings
  CONVERSATION_SESSION: DurableObjectNamespace;
  USER_IDENTITY: DurableObjectNamespace;
  FIRM_REGISTRY: DurableObjectNamespace;
  
  // Platform Admin Durable Object bindings
  PLATFORM_SESSION: DurableObjectNamespace;
  PLATFORM_AUDIT_LOG: DurableObjectNamespace;
  
  // Vectorize bindings
  SUPPORTING_DOCUMENTS: VectorizeIndex;
  CONFLICT_DATABASE: VectorizeIndex;
  
  // Workers AI binding
  AI: any; // Workers AI binding
  
  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  
  // Domain and API configuration
  API_BASE_URL?: string;
  ADMIN_BASE_URL?: string;
  PLATFORM_BASE_URL?: string;
  CORS_ORIGINS?: string;
  
  // Auth0 configuration
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  AUTH0_AUDIENCE?: string;
  
  // Rate limiting
  RATE_LIMIT_PER_MINUTE?: string;
  MAX_REQUEST_SIZE?: string;
  
  // API Keys
  ANTHROPIC_API_KEY: string;
  
  // OpenTelemetry configuration
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_EXPORTER_OTLP_PROTOCOL?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
  LOGFIRE_TOKEN?: string; // Pydantic Logfire authentication token
}
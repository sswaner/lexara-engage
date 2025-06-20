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

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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
  firmId: string;
  
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
  
  // Vectorize bindings
  SUPPORTING_DOCUMENTS: VectorizeIndex;
  CONFLICT_DATABASE: VectorizeIndex;
  
  // Workers AI binding
  AI: any; // Workers AI binding
  
  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  
  // API Keys
  ANTHROPIC_API_KEY: string;
}
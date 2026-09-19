from app.schemas.auth import UserRegister, UserLogin, Token, TokenRefresh, VerifyEmail, ForgotPassword, ResetPassword, ChangePassword, PhoneOTPRequest, PhoneOTPVerify
from app.schemas.user import UserRead, ProfileCreate, ProfileUpdate, ProfileRead, RoleRead
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleRead, VehicleSearchQuery
from app.schemas.event import TimelineEventRead, ServiceEventCreate, ServiceEventRead, MaintenanceEventCreate, MaintenanceEventRead, InsuranceEventRead, InspectionEventRead, OdometerReadingRead
from app.schemas.intelligence import OdometerAnalysis, MaintenanceScheduleItem, VehicleIntelligenceSummary, VehicleCompareRequest, VehicleCompareItem, VehicleCompareResponse, AIQueryRequest, AIQueryResponse, DataQualityIssueRead, AlertRead
from app.schemas.evidence import DocumentRead, InvoiceRead, InvoiceItemRead, EvidenceRead, EvidenceVerificationCreate
from app.schemas.admin import AdminDashboardStats, ProviderCreate, ProviderRead, AuditLogRead

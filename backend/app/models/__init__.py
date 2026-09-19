from app.core.database import Base
from app.models.user import User, Role, UserRole, Profile, RefreshToken, AuditLog
from app.models.vehicle import Vehicle, VehicleOwnership, VehicleSourceMapping, OdometerReading
from app.models.provider import Provider, ProviderUser
from app.models.event import ServiceEvent, MaintenanceEvent, InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Document, Invoice, InvoiceItem, Evidence, EvidenceVerification
from app.models.quality import DataQualityIssue, Alert
from app.models.intelligence import Report, ReportSnapshot, MLPrediction, ModelVersion, Notification, AIConversation, AIMessage

__all__ = [
    'Base',
    'User', 'Role', 'UserRole', 'Profile', 'RefreshToken', 'AuditLog',
    'Vehicle', 'VehicleOwnership', 'VehicleSourceMapping', 'OdometerReading',
    'Provider', 'ProviderUser',
    'ServiceEvent', 'MaintenanceEvent', 'InsuranceEvent', 'InspectionEvent', 'VehicleTimeline',
    'Document', 'Invoice', 'InvoiceItem', 'Evidence', 'EvidenceVerification',
    'DataQualityIssue', 'Alert',
    'Report', 'ReportSnapshot', 'MLPrediction', 'ModelVersion', 'Notification',
    'AIConversation', 'AIMessage'
]

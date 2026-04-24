# [AR] حزمة نماذج خط الأنابيب — تُعيد تصدير جميع النماذج للتوافق مع الاستيرادات الحالية
# [EN] Pipeline models package — re-exports all models for backward-compatible imports

from pipeline.models.equity import EquityPartnership, PartnershipAction
from pipeline.models.marketing import MarketingAction, MarketingCampaign, MarketingChannel
from pipeline.models.opportunity import Client, Opportunity, ServiceOffering
from pipeline.models.outreach import OutreachStep

__all__ = [
    "ServiceOffering",
    "MarketingChannel",
    "MarketingCampaign",
    "Client",
    "Opportunity",
    "MarketingAction",
    "OutreachStep",
    "EquityPartnership",
    "PartnershipAction",
]

from enum import Enum


class Role(str, Enum):
    VENDOR = "VENDOR"
    ADMIN = "ADMIN"


class Category(str, Enum):
    RX = "RX"
    OTC = "OTC"
    DME = "DME"
    WELLNESS = "WELLNESS"


class ListingStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DELISTED = "DELISTED"

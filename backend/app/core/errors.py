"""Domain errors raised by services, plus the code -> HTTP status map used by the API layer."""


class DomainError(Exception):
    code = "DOMAIN_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidCredentials(DomainError):
    code = "INVALID_CREDENTIALS"

    def __init__(self):
        super().__init__("Invalid username or password.")


HTTP_STATUS_BY_CODE = {
    "INVALID_CREDENTIALS": 401,
    "CATEGORY_NOT_ALLOWED": 422,
    "RX_VENDOR_NOT_LICENSED": 422,
    "DME_VENDOR_NOT_CREDENTIALED": 422,
    "PRICE_INVALID": 422,
    "REJECTION_REASON_REQUIRED": 422,
    "FORBIDDEN": 403,
    "NOT_FOUND": 404,
    "INVALID_STATUS_TRANSITION": 409,
}


def http_status_for(code: str) -> int:
    return HTTP_STATUS_BY_CODE.get(code, 400)

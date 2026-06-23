from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserMe"


class UserMe(BaseModel):
    id: int
    username: str
    phone: str | None = None
    display_name: str
    roles: list[str]
    permissions: list[str]
    default_portal: str


TokenResponse.model_rebuild()

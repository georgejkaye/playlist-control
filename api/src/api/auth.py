from datetime import timedelta, datetime
from typing import Annotated, Optional
from api.utils import get_env_variable, get_secret
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel


def get_secret_key() -> str:
    return get_secret("SECRET_KEY")


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token", auto_error=False)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


def verify_password(plain_password, hashed_password) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password) -> str:
    hashed_password = pwd_context.hash(password)
    return hashed_password


def authenticate_user(username: str, password: str) -> bool:
    valid_user = get_env_variable("ADMIN_USER")
    hashed_password = get_secret("ADMIN_PASSWORD_HASHED")
    if not (valid_user == username):
        return False
    if not verify_password(password, hashed_password):
        return False
    return True


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt


async def validate_token(
    token: Annotated[Optional[str], Depends(oauth2_scheme)]
) -> Optional[bool]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token:
        try:
            payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
            username: str | None = payload.get("sub")
            print(username)
            if username is None:
                raise credentials_exception
            if not username == get_env_variable("ADMIN_USER"):
                raise credentials_exception
            return True
        except JWTError:
            raise credentials_exception
    raise credentials_exception

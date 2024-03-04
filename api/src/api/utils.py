import os
from typing import Optional


def read_secret(env_var: str) -> str:
    file = get_env_variable(env_var)
    if os.path.isfile(file):
        with open(file) as f:
            value = f.readline().replace("\n", "")
        return value
    raise ValueError(f"Secret file {file} does not exist")


def get_env_variable(name: str) -> str:
    var = os.getenv(name)
    if var:
        return var
    else:
        raise ValueError(f"Environment variable {name} not set")
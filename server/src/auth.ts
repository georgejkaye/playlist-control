import { getSecret } from "./utils.ts"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken"
import { getPasswordHash } from "./database.ts"
import { randomBytes } from "crypto"

export const tokenExpiresMinutes = 60 * 12

const secretKeyFile = process.env.SECRET_KEY_FILE || "key.secret"
const secretKey = await getSecret(secretKeyFile)
const salt = await bcrypt.genSalt()

const passwordLength = 6

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, salt)
}

export const generatePassword = async () => {
  const password = randomBytes(passwordLength / 2).toString("hex")
  const hashedPassword = await hashPassword(password)
  return { password, hashedPassword }
}

const compareWithAdminPassword = (password: string, hashedPassword: string) => {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(password, hashedPassword, (err, same) => {
      if (err) {
        reject(err)
      } else {
        resolve(same)
      }
    })
  })
}

export const authenticateUser = async (
  sessionSlug: string,
  password: string
) => {
  return new Promise<boolean>(async (resolve, reject) => {
    let hashedPassword = await getPasswordHash(sessionSlug)
    if (!hashedPassword) {
      resolve(false)
    } else {
      let same = await compareWithAdminPassword(password, hashedPassword)
      resolve(same)
    }
  })
}

export const generateToken = (sessionSlug: string) => {
  let expiresIn = tokenExpiresMinutes * 60
  let expiresAt = new Date(new Date().getTime() + expiresIn * 60000)
  return new Promise<{ token: string; expiresAt: Date }>((resolve, reject) => {
    jwt.sign(
      { sub: sessionSlug },
      secretKey,
      {
        expiresIn,
      },
      (error, encoded) => {
        if (error) {
          reject(error)
        } else if (encoded) {
          resolve({ token: encoded, expiresAt })
        } else {
          reject(false)
        }
      }
    )
  })
}
export const verifyToken = async (token: string) =>
  new Promise<JwtPayload>((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        reject(error)
      } else if (decoded) {
        if (typeof decoded === "string") {
          reject(false)
        } else {
          resolve(decoded)
        }
      } else {
        reject(false)
      }
    })
  })

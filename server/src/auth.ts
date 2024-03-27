import { getSecret, getSecretSync } from "./utils.js"
import bcrypt from "bcryptjs"
import jwt, { JwtPayload, SignCallback, VerifyCallback } from "jsonwebtoken"

export const tokenExpiresMinutes = 30

export const adminUser = process.env.ADMIN_USER || "admin"
const adminPasswordHashedFile =
  process.env.ADMIN_PASSWORD_HASHED || "admin.secret"
const adminPasswordHashed = await getSecret(adminPasswordHashedFile)
const secretKeyFile = process.env.SECRET_KEY || "api.secret"
const secretKey = await getSecret(secretKeyFile)

const compareWithAdminPassword = (password: string) => {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(password, adminPasswordHashed, (err, same) => {
      if (err) {
        reject(err)
      } else {
        resolve(same)
      }
    })
  })
}

export const authenticateUser = async (username: string, password: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    if (!(username === adminUser)) {
      resolve(false)
    } else {
      let same = await compareWithAdminPassword(password)
      resolve(same)
    }
  })
}

export const generateToken = (user: string) =>
  new Promise((resolve, reject) => {
    jwt.sign(
      { sub: user },
      secretKey,
      {
        expiresIn: tokenExpiresMinutes * 60,
      },
      (error, encoded) => {
        if (error) {
          reject(error)
        } else if (encoded) {
          resolve(encoded)
        } else {
          reject(false)
        }
      }
    )
  })

export const verifyToken = async (token: string) =>
  new Promise<string | JwtPayload>((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        reject(error)
      } else if (decoded) {
        resolve(decoded)
      } else {
        reject(false)
      }
    })
  })

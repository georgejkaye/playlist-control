import { getSecret } from "./utils.js"
import bcrypt from "bcryptjs"
import jwt, { JwtPayload } from "jsonwebtoken"
import { getPasswordHash } from "./database.js"
import { randomBytes } from "crypto"

export const tokenExpiresMinutes = 30

const secretKeyFile = process.env.SECRET_KEY || "api.secret"
const secretKey = await getSecret(secretKeyFile)
const salt = await bcrypt.genSalt()

const passwordLength = 6

export const generatePassword = async () => {
  const password = randomBytes(passwordLength / 2).toString("hex")
  const hashedPassword = await bcrypt.hash(password, salt)
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

export const authenticateUser = async (sessionId: number, password: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    let hashedPassword = await getPasswordHash(sessionId)
    if (!hashedPassword) {
      resolve(false)
    } else {
      let same = await compareWithAdminPassword(password, hashedPassword)
      resolve(same)
    }
  })
}

export const generateToken = (sessionId: number) =>
  new Promise<string>((resolve, reject) => {
    jwt.sign(
      { sub: sessionId },
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

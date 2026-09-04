import { isEmail, isUUID } from 'class-validator';
import * as jwt from 'jsonwebtoken';

export type IosSessionAssertion = {
  sub: string;
  email: string;
  name: string;
  ios_workspace_id: string;
  role: 'owner' | 'admin' | 'member';
  jti: string;
  iat: number;
  exp: number;
};

const IOS_SESSION_CLOCK_TOLERANCE_SECONDS = 5;
const IOS_SESSION_MAX_AGE_SECONDS = 60;

const isIosSessionAssertion = (
  payload: jwt.JwtPayload,
): payload is jwt.JwtPayload & IosSessionAssertion =>
  typeof payload.sub === 'string' &&
  isUUID(payload.sub) &&
  typeof payload.email === 'string' &&
  isEmail(payload.email) &&
  typeof payload.name === 'string' &&
  payload.name.trim().length > 0 &&
  typeof payload.ios_workspace_id === 'string' &&
  isUUID(payload.ios_workspace_id) &&
  (payload.role === 'owner' ||
    payload.role === 'admin' ||
    payload.role === 'member') &&
  typeof payload.jti === 'string' &&
  payload.jti.length > 0 &&
  typeof payload.iat === 'number' &&
  typeof payload.exp === 'number' &&
  payload.exp > payload.iat &&
  payload.exp - payload.iat <= IOS_SESSION_MAX_AGE_SECONDS;

export const verifyIosSessionAssertion = (
  token: string,
  secret: string,
  nowInSeconds = Math.floor(Date.now() / 1000),
): IosSessionAssertion => {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: 'twenty-crm',
      issuer: 'intelligence-os',
      clockTimestamp: nowInSeconds,
    });

    if (
      typeof payload === 'string' ||
      !isIosSessionAssertion(payload) ||
      payload.iat < nowInSeconds - IOS_SESSION_MAX_AGE_SECONDS ||
      payload.iat > nowInSeconds + IOS_SESSION_CLOCK_TOLERANCE_SECONDS ||
      payload.exp > nowInSeconds + IOS_SESSION_MAX_AGE_SECONDS
    ) {
      throw new Error();
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      ios_workspace_id: payload.ios_workspace_id,
      role: payload.role,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    throw new Error('Invalid IOS session assertion');
  }
};

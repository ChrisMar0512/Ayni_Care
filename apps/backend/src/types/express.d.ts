import { MemberRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Populated by authenticate middleware. All fields guaranteed after authenticate().
      // For authenticateNewUser (create/join family), only id is guaranteed.
      user: {
        id: string;
        familyId: string;
        role: MemberRole;
        memberId: string;
      };
      // Populated by validate middleware with the Zod-parsed body
      validatedBody: unknown;
    }
  }
}

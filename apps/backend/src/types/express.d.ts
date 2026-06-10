// No top-level import — file stays an ambient script so TypeScript picks it up globally.
// Use import() type expressions to reference external types inline.
declare namespace Express {
  interface Request {
    // Populated by authenticate middleware. All fields guaranteed after authenticate().
    // For authenticateNewUser (create/join family), only id is guaranteed.
    user: {
      id: string;
      familyId: string;
      role: import('@prisma/client').MemberRole;
      memberId: string;
    };
    // Populated by validate middleware with the Zod-parsed body
    validatedBody: unknown;
  }
}

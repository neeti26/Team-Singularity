/**
 * Firebase Admin SDK singleton for server-side Firestore access.
 * Safe to import in Next.js API routes and Server Components.
 */
import * as admin from 'firebase-admin';

// Prevent re-initialisation in Next.js hot-reload
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    privateKey
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } else {
    // Fallback: use Application Default Credentials (works on Cloud Run automatically)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

export const db       = admin.firestore();
export const adminAuth = admin.auth();
export default admin;

// ── Firestore collection helpers ──────────────────────────────

export const collections = {
  documents:   () => db.collection('documents'),
  chunks:      () => db.collection('chunks'),
  decisions:   () => db.collection('decisions'),
  actionItems: () => db.collection('actionItems'),
  chatSessions:() => db.collection('chatSessions'),
  embeddings:  () => db.collection('embeddings'),
  nudgeLogs:   () => db.collection('nudgeLogs'),
} as const;

/**
 * Netlify sets NETLIFY=true during `next build`, but Blobs only work at runtime
 * (serverless functions). Use local/defaults during the build phase.
 */
export function shouldUseNetlifyBlobs(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return false;
  }

  return (
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

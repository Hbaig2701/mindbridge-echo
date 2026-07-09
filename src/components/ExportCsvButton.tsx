'use client';

// Triggers the grant CSV download for a profile via GET /api/progress.

import { Button } from '@/components/ui';

export function ExportCsvButton({ profileId }: { profileId: string }) {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        window.location.href = `/api/progress?profileId=${encodeURIComponent(profileId)}`;
      }}
    >
      Export CSV (for grant)
    </Button>
  );
}
